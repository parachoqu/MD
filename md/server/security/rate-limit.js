import { hmac } from "./crypto.js";

export const RATE_LIMITS = Object.freeze({
  login: { limit: 8, windowSeconds: 15 * 60, blockSeconds: 15 * 60 },
  password_reset: { limit: 4, windowSeconds: 60 * 60, blockSeconds: 60 * 60 },
  contact: { limit: 5, windowSeconds: 15 * 60, blockSeconds: 30 * 60 },
  registration: { limit: 8, windowSeconds: 15 * 60, blockSeconds: 30 * 60 },
  upload: { limit: 20, windowSeconds: 15 * 60, blockSeconds: 30 * 60 },
});

function floorWindow(date, seconds) {
  const millis = seconds * 1000;
  return new Date(Math.floor(date.getTime() / millis) * millis);
}

export function subjectHash(scope, subject, secret) {
  return hmac(`${scope}:${subject}`, secret);
}

export async function consumeRateLimit(database, scope, subject, options = {}) {
  const policy = options.policy || RATE_LIMITS[scope];
  if (!policy) throw new Error(`Rate limit desconhecido: ${scope}`);
  const now = options.now || new Date();
  const windowStart = floorWindow(now, policy.windowSeconds);

  const result = await database.query(
    `INSERT INTO rate_limit_buckets (scope, subject_hash, window_start, hit_count, updated_at)
     VALUES ($1, $2, $3, 1, $4)
     ON CONFLICT (scope, subject_hash, window_start)
     DO UPDATE SET hit_count = rate_limit_buckets.hit_count + 1, updated_at = EXCLUDED.updated_at
     RETURNING hit_count, blocked_until`,
    [scope, subject, windowStart.toISOString(), now.toISOString()]
  );
  const bucket = result.rows[0];
  const blockedUntil = bucket.blocked_until ? new Date(bucket.blocked_until) : null;

  if (blockedUntil && blockedUntil > now) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((blockedUntil - now) / 1000)) };
  }

  if (Number(bucket.hit_count) > policy.limit) {
    const next = new Date(now.getTime() + policy.blockSeconds * 1000);
    await database.query(
      `UPDATE rate_limit_buckets SET blocked_until = $4, updated_at = $5
       WHERE scope = $1 AND subject_hash = $2 AND window_start = $3`,
      [scope, subject, windowStart.toISOString(), next.toISOString(), now.toISOString()]
    );
    return { allowed: false, retryAfter: policy.blockSeconds };
  }

  return {
    allowed: true,
    remaining: Math.max(0, policy.limit - Number(bucket.hit_count)),
    retryAfter: Math.max(1, Math.ceil((windowStart.getTime() + policy.windowSeconds * 1000 - now) / 1000)),
  };
}
