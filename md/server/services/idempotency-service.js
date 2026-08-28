import { AppError, conflictError } from "../http/errors.js";
import { hmac, payloadHash } from "../security/crypto.js";

const KEY_PATTERN = /^[A-Za-z0-9._:-]{8,200}$/;

export function readIdempotencyKey(request) {
  const key = String(request.headers.get("idempotency-key") || "").trim();
  if (!KEY_PATTERN.test(key)) {
    throw new AppError("IDEMPOTENCY_KEY_REQUIRED", "Envie uma chave de idempotencia valida.", 422, {
      fields: { idempotencyKey: "Use entre 8 e 200 caracteres seguros." },
    });
  }
  return key;
}

export function idempotencyHashes(scope, key, payload, secret) {
  return {
    keyHash: hmac(`idempotency:${scope}:${key}`, secret),
    requestHash: payloadHash(payload),
  };
}

export async function reserveIdempotency(database, options) {
  const now = options.now || new Date();
  const expiresAt = options.expiresAt || new Date(now.getTime() + 24 * 60 * 60 * 1000);
  await database.query(
    "DELETE FROM idempotency_keys WHERE scope = $1 AND key_hash = $2 AND expires_at <= $3",
    [options.scope, options.keyHash, now.toISOString()]
  );
  const inserted = await database.query(
    `INSERT INTO idempotency_keys (scope, key_hash, request_hash, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (scope, key_hash) DO NOTHING
     RETURNING scope`,
    [options.scope, options.keyHash, options.requestHash, now.toISOString(), expiresAt.toISOString()]
  );
  if (inserted.rows.length) return { state: "reserved" };

  const existing = await database.query(
    `SELECT request_hash, response_status, response_body, resource_id
     FROM idempotency_keys WHERE scope = $1 AND key_hash = $2 LIMIT 1`,
    [options.scope, options.keyHash]
  );
  const row = existing.rows[0];
  if (!row) throw conflictError("Nao foi possivel reservar a submissao. Tente novamente.");
  if (row.request_hash !== options.requestHash) {
    throw new AppError(
      "IDEMPOTENCY_CONFLICT",
      "A chave de idempotencia ja foi usada com outro conteudo.",
      409
    );
  }
  if (row.response_body && row.response_status) {
    return {
      state: "replay",
      status: Number(row.response_status),
      body: row.response_body,
      resourceId: row.resource_id,
    };
  }
  throw conflictError("A mesma submissao ainda esta em processamento.");
}

export async function completeIdempotency(database, options) {
  await database.query(
    `UPDATE idempotency_keys
     SET response_status = $4, response_body = $5::jsonb, resource_id = $6
     WHERE scope = $1 AND key_hash = $2 AND request_hash = $3`,
    [
      options.scope,
      options.keyHash,
      options.requestHash,
      options.status,
      JSON.stringify(options.body),
      options.resourceId || null,
    ]
  );
}
