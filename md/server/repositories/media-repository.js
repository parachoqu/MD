import { AppError, conflictError, notFoundError } from "../http/errors.js";
import { recordAudit } from "./audit-repository.js";
import { mediaUpdateSchema } from "../validation/submissions.js";

function formatFor(mimeType) {
  return ({ "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp", "image/svg+xml": "svg" })[mimeType] || "file";
}

function dto(row) {
  return {
    id: row.id,
    kind: row.provider === "static" ? "static" : "upload",
    provider: row.provider,
    storageKey: row.storage_key,
    format: formatFor(row.mime_type),
    path: row.url,
    url: row.url,
    alt: row.alt_text,
    label: row.label,
    width: row.width === null ? null : Number(row.width),
    height: row.height === null ? null : Number(row.height),
    sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
    originalFilename: row.original_filename,
    readOnly: Boolean(row.read_only),
    revision: Number(row.revision),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export function createMediaRepository(database) {
  async function list(filters = {}) {
    const result = await database.query("SELECT * FROM media_assets WHERE deleted_at IS NULL ORDER BY created_at DESC, id");
    let items = result.rows.map(dto);
    if (filters.query) {
      const query = String(filters.query).trim().toLocaleLowerCase("pt-BR");
      items = items.filter((item) => `${item.label} ${item.alt}`.toLocaleLowerCase("pt-BR").includes(query));
    }
    if (filters.format) items = items.filter((item) => item.format === filters.format);
    if (filters.kind) items = items.filter((item) => item.kind === filters.kind);
    return items;
  }

  async function get(id) {
    const result = await database.query("SELECT * FROM media_assets WHERE id = $1 AND deleted_at IS NULL LIMIT 1", [id]);
    if (!result.rows[0]) throw notFoundError("Midia nao encontrada.");
    return dto(result.rows[0]);
  }

  async function update(id, input, actorUserId) {
    const parsed = mediaUpdateSchema.parse(input);
    return database.transaction(async (tx) => {
      const result = await tx.query(
        `UPDATE media_assets SET label = $2, alt_text = $3, revision = revision + 1,
                updated_by = $4, updated_at = now()
         WHERE id = $1 AND revision = $5 AND deleted_at IS NULL AND read_only = false
         RETURNING *`,
        [id, parsed.label, parsed.alt, actorUserId || null, parsed.revision]
      );
      if (!result.rows[0]) {
        const row = await tx.query("SELECT revision, read_only FROM media_assets WHERE id = $1 AND deleted_at IS NULL", [id]);
        if (!row.rows[0]) throw notFoundError("Midia nao encontrada.");
        if (row.rows[0].read_only) throw new AppError("READ_ONLY", "Ativos estaticos sao somente leitura.", 409);
        throw conflictError();
      }
      await recordAudit(tx, {
        actorUserId,
        action: "media.update",
        entityType: "media_asset",
        entityId: id,
        previousRevision: parsed.revision,
        newRevision: parsed.revision + 1,
      });
      return dto(result.rows[0]);
    });
  }

  async function usage(id) {
    await get(id);
    const result = await database.query(
      `SELECT entity_type, entity_id, field_path FROM media_usages
       WHERE media_id = $1 ORDER BY entity_type, entity_id, field_path`,
      [id]
    );
    return result.rows.map((row) => ({
      domain: row.entity_type,
      entityId: row.entity_id,
      fieldPath: row.field_path,
      label: `${row.entity_id} / ${row.field_path}`,
    }));
  }

  async function remove(id, expectedRevision, actorUserId, removeBlob) {
    const item = await get(id);
    if (item.readOnly || item.provider === "static") {
      throw new AppError("READ_ONLY", "Ativos estaticos nao podem ser excluidos.", 409);
    }
    if (item.revision !== Number(expectedRevision)) throw conflictError();
    const uses = await usage(id);
    if (uses.length) {
      throw new AppError("MEDIA_IN_USE", "Esta midia esta em uso e nao pode ser excluida.", 409, {
        fields: { usage: uses },
      });
    }
    await database.query(
      `UPDATE media_assets SET deleted_at = now(), updated_at = now(), updated_by = $3
       WHERE id = $1 AND revision = $2 AND deleted_at IS NULL`,
      [id, expectedRevision, actorUserId || null]
    );
    try {
      await removeBlob(item.url);
    } catch (error) {
      await database.query("UPDATE media_assets SET deleted_at = NULL, updated_at = now() WHERE id = $1", [id]);
      throw new AppError("BLOB_DELETE_FAILED", "Nao foi possivel excluir o arquivo. Tente novamente.", 500);
    }
    await recordAudit(database, {
      actorUserId,
      action: "media.delete",
      entityType: "media_asset",
      entityId: id,
      previousRevision: expectedRevision,
      newRevision: expectedRevision,
    });
    return true;
  }

  return { list, get, update, usage, remove, _dto: dto };
}
