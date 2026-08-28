import { AppError } from "../http/errors.js";

function collect(value, key, result) {
  if (Array.isArray(value)) {
    value.forEach((item) => collect(item, key, result));
    return;
  }
  if (!value || typeof value !== "object") return;
  Object.entries(value).forEach(([childKey, childValue]) => {
    const isMediaField = /mediaId$/i.test(childKey) || (childKey === "image" && String(childValue || "").startsWith("media-"));
    if (isMediaField && typeof childValue === "string" && childValue) {
      const fieldPath = key ? `${key}.${childKey}` : childKey;
      result.set(`${childValue}\u0000${fieldPath}`, { mediaId: childValue, fieldPath });
    }
    collect(childValue, key ? `${key}.${childKey}` : childKey, result);
  });
}

export function extractMediaUsages(...documents) {
  const result = new Map();
  documents.forEach((document) => collect(document, "", result));
  return result;
}

export async function syncMediaUsages(database, entityType, entityId, ...documents) {
  const usages = extractMediaUsages(...documents);
  for (const { mediaId } of usages.values()) {
    const exists = await database.query(
      "SELECT 1 FROM media_assets WHERE id = $1 AND deleted_at IS NULL LIMIT 1",
      [mediaId]
    );
    if (!exists.rows.length) {
      throw new AppError("MEDIA_NOT_FOUND", `Midia referenciada nao encontrada: ${mediaId}.`, 422);
    }
  }
  await database.query("DELETE FROM media_usages WHERE entity_type = $1 AND entity_id = $2", [entityType, entityId]);
  for (const { mediaId, fieldPath } of usages.values()) {
    await database.query(
      `INSERT INTO media_usages (media_id, entity_type, entity_id, field_path)
       VALUES ($1, $2, $3, $4)`,
      [mediaId, entityType, entityId, fieldPath]
    );
  }
}
