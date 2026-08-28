import { z } from "zod";
import { AppError } from "../http/errors.js";
import { createContentRepository } from "../repositories/content-repository.js";
import { createEventRepository } from "../repositories/event-repository.js";
import { createMediaRepository } from "../repositories/media-repository.js";
import { syncMediaUsages } from "../repositories/media-usage-repository.js";
import { createProjectRepository } from "../repositories/project-repository.js";
import { recordAudit } from "../repositories/audit-repository.js";
import { settingsDraftSchema, sitePageDraftSchema } from "../validation/content.js";
import { eventDraftSchema } from "../validation/event.js";
import { projectDraftSchema } from "../validation/project.js";

export const ADMIN_EXPORT_SCHEMA_VERSION = 1;

const exportSchema = z
  .object({
    schemaVersion: z.literal(ADMIN_EXPORT_SCHEMA_VERSION),
    exportedAt: z.string().datetime(),
    source: z.string().trim().min(1).max(120).optional(),
    events: z.array(z.record(z.string(), z.unknown())).max(10_000),
    projects: z.array(z.record(z.string(), z.unknown())).max(10_000),
    content: z.record(z.string(), z.record(z.string(), z.unknown())),
    settings: z.record(z.string(), z.unknown()),
    media: z.array(z.record(z.string(), z.unknown())).max(50_000),
  })
  .strict();

const SYSTEM_FIELDS = new Set([
  "id",
  "order",
  "editorialStatus",
  "revision",
  "publishedRevision",
  "createdAt",
  "updatedAt",
  "seededAt",
  "publishedAt",
  "archivedAt",
]);

function draftData(value) {
  return Object.fromEntries(
    Object.entries(structuredClone(value || {})).filter(([key]) => !SYSTEM_FIELDS.has(key))
  );
}

function statusOf(value, fallback = "published") {
  return ["draft", "published", "archived"].includes(value?.editorialStatus)
    ? value.editorialStatus
    : fallback;
}

function mimeType(item) {
  if (item.mimeType) return item.mimeType;
  return ({ jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", svg: "image/svg+xml" })[
    String(item.format || "").toLowerCase()
  ] || "application/octet-stream";
}

function staticMedia(item) {
  const provider = item.provider || (item.kind === "static" ? "static" : "local");
  const url = String(item.url || item.path || "");
  return provider === "static" && Boolean(item.id && url);
}

function blobMedia(item) {
  const provider = item.provider || (item.kind === "upload" && item.storageKey ? "vercel_blob" : "local");
  return provider === "vercel_blob" && Boolean(item.id && item.storageKey && item.url);
}

function ensureText(value, label) {
  const text = String(value || "").trim();
  if (!text) throw new AppError("INVALID_ADMIN_EXPORT", `${label} ausente na exportacao.`, 422);
  return text;
}

function publicationColumns(status, data, exportedAt) {
  return {
    publishedData: status === "published" ? JSON.stringify(data) : null,
    publishedRevision: status === "published" ? 1 : 0,
    publishedAt: status === "published" ? exportedAt : null,
    archivedAt: status === "archived" ? exportedAt : null,
  };
}

async function insertEditorial(tx, options) {
  const publication = publicationColumns(options.status, options.data, options.exportedAt);
  const columns = [
    "id",
    ...(options.slug ? ["slug"] : []),
    ...(options.order !== undefined ? ["sort_order", "published_sort_order"] : []),
    "draft_data",
    "published_data",
    "editorial_status",
    "revision",
    "published_revision",
    "published_at",
    "archived_at",
  ];
  const values = [
    options.id,
    ...(options.slug ? [options.slug] : []),
    ...(options.order !== undefined
      ? [options.order, options.status === "published" ? options.order : null]
      : []),
    JSON.stringify(options.data),
    publication.publishedData,
    options.status,
    1,
    publication.publishedRevision,
    publication.publishedAt,
    publication.archivedAt,
  ];
  const jsonIndexes = new Set([
    columns.indexOf("draft_data"),
    columns.indexOf("published_data"),
  ]);
  const placeholders = values.map((_, index) => `$${index + 1}${jsonIndexes.has(index) ? "::jsonb" : ""}`);
  const result = await tx.query(
    `INSERT INTO ${options.table} (${columns.join(", ")})
     VALUES (${placeholders.join(", ")})
     ON CONFLICT (id) DO NOTHING RETURNING id`,
    values
  );
  return Boolean(result.rows.length);
}

export async function createAdminExport(database, options = {}) {
  const events = createEventRepository(database);
  const projects = createProjectRepository(database);
  const content = createContentRepository(database);
  const media = createMediaRepository(database);
  const [eventItems, projectItems, home, catalog, settings, mediaItems] = await Promise.all([
    events.listAdmin(),
    projects.listAdmin(),
    content.getPage("home"),
    content.getPage("catalog"),
    content.getSettings(),
    media.list(),
  ]);
  return {
    schemaVersion: ADMIN_EXPORT_SCHEMA_VERSION,
    exportedAt: (options.clock || (() => new Date()))().toISOString(),
    source: "md-temporary-vercel-backend",
    events: eventItems,
    projects: projectItems,
    content: { home, catalog },
    settings,
    media: mediaItems.map((item) => ({
      ...item,
      storageKey: item.storageKey || null,
      note:
        item.provider === "vercel_blob"
          ? "Metadados apenas; o arquivo do Blob deve ser verificado no ambiente de destino."
          : undefined,
    })),
  };
}

export function validateAdminExport(source) {
  const parsed = exportSchema.parse(source);
  parsed.events.forEach((item) => eventDraftSchema.parse(draftData(item)));
  parsed.projects.forEach((item) => projectDraftSchema.parse(draftData(item)));
  Object.entries(parsed.content).forEach(([pageId, item]) => {
    if (!['home', 'catalog'].includes(pageId)) {
      throw new AppError("INVALID_ADMIN_EXPORT", `Pagina nao suportada: ${pageId}.`, 422);
    }
    sitePageDraftSchema.parse(draftData(item));
  });
  settingsDraftSchema.parse(draftData(parsed.settings));
  return parsed;
}

export async function importAdminExport(database, source, options = {}) {
  const parsed = validateAdminExport(source);
  if (options.dryRun) {
    return {
      valid: true,
      counts: {
        events: parsed.events.length,
        projects: parsed.projects.length,
        content: Object.keys(parsed.content).length,
        settings: 1,
        media: parsed.media.length,
      },
    };
  }

  return database.transaction(async (tx) => {
    const inserted = { media: 0, events: 0, projects: 0, content: 0, settings: 0 };
    const pendingMedia = [];
    for (const item of parsed.media) {
      const canTrustBlob = options.trustExistingBlobUrls && blobMedia(item);
      if (!staticMedia(item) && !canTrustBlob) {
        pendingMedia.push({ id: item.id || null, label: item.label || item.originalFilename || "Midia local" });
        continue;
      }
      const provider = canTrustBlob ? "vercel_blob" : "static";
      const url = ensureText(item.url || item.path, "URL de midia");
      const result = await tx.query(
        `INSERT INTO media_assets
          (id, provider, storage_key, url, label, alt_text, mime_type, size_bytes,
           width, height, original_filename, read_only)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO NOTHING RETURNING id`,
        [
          ensureText(item.id, "ID de midia"),
          provider,
          provider === "vercel_blob" ? ensureText(item.storageKey, "storageKey") : null,
          url,
          ensureText(item.label || item.originalFilename || item.id, "Rotulo de midia"),
          ensureText(item.alt || item.altText, "Texto alternativo"),
          mimeType(item),
          item.sizeBytes ?? null,
          item.width ?? null,
          item.height ?? null,
          item.originalFilename || null,
          provider === "static",
        ]
      );
      inserted.media += result.rows.length;
    }

    for (const item of parsed.events) {
      const data = eventDraftSchema.parse(draftData(item));
      const status = statusOf(item);
      const wasInserted = await insertEditorial(tx, {
        table: "events",
        id: ensureText(item.id, "ID de evento"),
        slug: data.slug,
        status,
        data,
        exportedAt: parsed.exportedAt,
      });
      if (wasInserted) {
        inserted.events += 1;
        await syncMediaUsages(tx, "event", item.id, data, status === "published" ? data : null);
      }
    }

    for (const [index, item] of parsed.projects.entries()) {
      const data = projectDraftSchema.parse(draftData(item));
      const status = statusOf(item);
      const wasInserted = await insertEditorial(tx, {
        table: "projects",
        id: ensureText(item.id, "ID de projeto"),
        slug: ensureText(data.slug || item.slug || item.id, "Slug de projeto"),
        order: Number.isInteger(Number(item.order)) ? Number(item.order) : index,
        status,
        data,
        exportedAt: parsed.exportedAt,
      });
      if (wasInserted) {
        inserted.projects += 1;
        await syncMediaUsages(tx, "project", item.id, data, status === "published" ? data : null);
      }
    }

    for (const [pageId, item] of Object.entries(parsed.content)) {
      const data = sitePageDraftSchema.parse(draftData(item));
      const status = statusOf(item);
      const wasInserted = await insertEditorial(tx, {
        table: "site_pages",
        id: pageId,
        status,
        data,
        exportedAt: parsed.exportedAt,
      });
      if (wasInserted) {
        inserted.content += 1;
        await syncMediaUsages(tx, "site_page", pageId, data, status === "published" ? data : null);
      }
    }

    const settings = settingsDraftSchema.parse(draftData(parsed.settings));
    const settingsStatus = statusOf(parsed.settings);
    const settingsInserted = await insertEditorial(tx, {
      table: "site_settings",
      id: "global",
      status: settingsStatus,
      data: settings,
      exportedAt: parsed.exportedAt,
    });
    if (settingsInserted) {
      inserted.settings = 1;
      await syncMediaUsages(tx, "site_settings", "global", settings, settingsStatus === "published" ? settings : null);
    }

    await recordAudit(tx, {
      actorLabel: "manual-admin-import",
      action: "admin_export.import",
      entityType: "system",
      metadata: { schemaVersion: parsed.schemaVersion, inserted, pendingMediaCount: pendingMedia.length },
    });
    return { valid: true, inserted, pendingMedia };
  });
}
