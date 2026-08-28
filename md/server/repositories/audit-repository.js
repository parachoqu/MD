import { randomToken } from "../security/crypto.js";

export async function recordAudit(database, entry) {
  const metadata = entry.metadata && typeof entry.metadata === "object" ? entry.metadata : {};
  await database.query(
    `INSERT INTO audit_logs
      (id, actor_user_id, actor_label, action, entity_type, entity_id,
       previous_revision, new_revision, result, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
    [
      `audit_${randomToken(12)}`,
      entry.actorUserId || null,
      entry.actorLabel || null,
      entry.action,
      entry.entityType,
      entry.entityId || null,
      entry.previousRevision ?? null,
      entry.newRevision ?? null,
      entry.result || "success",
      JSON.stringify(metadata),
    ]
  );
}

export async function listAudit(database, options = {}) {
  const limit = Math.min(100, Math.max(1, Number(options.limit || 20)));
  const result = await database.query(
    `SELECT id, actor_user_id, actor_label, action, entity_type, entity_id,
            previous_revision, new_revision, result, metadata, created_at
     FROM audit_logs ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}
