import { recordAudit } from "../repositories/audit-repository.js";
import { syncMediaUsages } from "../repositories/media-usage-repository.js";
import { currentSeedData } from "../seed-data.js";
import { settingsDraftSchema, sitePageDraftSchema } from "../validation/content.js";
import { eventDraftSchema } from "../validation/event.js";
import { projectDraftSchema } from "../validation/project.js";

function stripSystemFields(value) {
  const copy = structuredClone(value);
  [
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
  ].forEach((key) => delete copy[key]);
  return copy;
}

function mimeType(format) {
  return ({ jpeg: "image/jpeg", jpg: "image/jpeg", png: "image/png", webp: "image/webp", svg: "image/svg+xml" })[format] || "application/octet-stream";
}

export async function applySeed(database, source = currentSeedData()) {
  return database.transaction(async (tx) => {
    const inserted = { media: 0, events: 0, projects: 0, content: 0, settings: 0 };
    for (const media of source.media) {
      const result = await tx.query(
        `INSERT INTO media_assets
          (id, provider, url, label, alt_text, mime_type, size_bytes, width, height,
           original_filename, read_only)
         VALUES ($1, 'static', $2, $3, $4, $5, $6, $7, $8, $9, true)
         ON CONFLICT (id) DO NOTHING RETURNING id`,
        [
          media.id,
          String(media.path).replace(/^\.\.\//, "/"),
          media.label,
          media.alt,
          mimeType(media.format),
          media.sizeBytes ?? null,
          media.width ?? null,
          media.height ?? null,
          media.originalFilename ?? null,
        ]
      );
      inserted.media += result.rows.length;
    }

    for (const event of source.events) {
      const data = eventDraftSchema.parse(stripSystemFields(event));
      const result = await tx.query(
        `INSERT INTO events
          (id, slug, draft_data, published_data, editorial_status, revision,
           published_revision, published_at)
         VALUES ($1, $2, $3::jsonb, $3::jsonb, 'published', 1, 1, now())
         ON CONFLICT (id) DO NOTHING RETURNING id`,
        [event.id, event.slug, JSON.stringify(data)]
      );
      if (result.rows.length) {
        inserted.events += 1;
        await syncMediaUsages(tx, "event", event.id, data);
      }
    }

    for (const project of source.projects) {
      const data = projectDraftSchema.parse(stripSystemFields(project));
      const result = await tx.query(
        `INSERT INTO projects
          (id, slug, sort_order, published_sort_order, draft_data, published_data,
           editorial_status, revision, published_revision, published_at)
         VALUES ($1, $2, $3, $3, $4::jsonb, $4::jsonb, 'published', 1, 1, now())
         ON CONFLICT (id) DO NOTHING RETURNING id`,
        [project.id, project.slug || project.id, Number(project.order || 0), JSON.stringify(data)]
      );
      if (result.rows.length) {
        inserted.projects += 1;
        await syncMediaUsages(tx, "project", project.id, data);
      }
    }

    for (const [pageId, page] of Object.entries(source.content)) {
      const data = sitePageDraftSchema.parse(stripSystemFields(page));
      const result = await tx.query(
        `INSERT INTO site_pages
          (id, draft_data, published_data, editorial_status, revision,
           published_revision, published_at)
         VALUES ($1, $2::jsonb, $2::jsonb, 'published', 1, 1, now())
         ON CONFLICT (id) DO NOTHING RETURNING id`,
        [pageId, JSON.stringify(data)]
      );
      if (result.rows.length) {
        inserted.content += 1;
        await syncMediaUsages(tx, "site_page", pageId, data);
      }
    }

    const settings = settingsDraftSchema.parse(stripSystemFields(source.settings));
    const settingsResult = await tx.query(
      `INSERT INTO site_settings
        (id, draft_data, published_data, editorial_status, revision,
         published_revision, published_at)
       VALUES ('global', $1::jsonb, $1::jsonb, 'published', 1, 1, now())
       ON CONFLICT (id) DO NOTHING RETURNING id`,
      [JSON.stringify(settings)]
    );
    if (settingsResult.rows.length) {
      inserted.settings = 1;
      await syncMediaUsages(tx, "site_settings", "global", settings);
    }
    await recordAudit(tx, {
      actorLabel: "manual-seed",
      action: "seed.apply",
      entityType: "system",
      metadata: inserted,
    });
    return inserted;
  });
}
