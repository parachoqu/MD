import { recordAudit } from "../repositories/audit-repository.js";
import { getIpHash } from "../security/request.js";
import { consumeRateLimit, subjectHash } from "../security/rate-limit.js";
import { rateLimitError } from "../http/errors.js";

const GENERIC_RESPONSE = Object.freeze({
  message: "Se a conta estiver ativa e a recuperacao automatizada estiver disponivel, as instrucoes serao enviadas.",
  automatedDeliveryAvailable: false,
});

function normalizedEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 320 ? email : "invalid@example.invalid";
}

export function createPasswordResetService(database, config) {
  async function requestReset(rawEmail, request) {
    const email = normalizedEmail(rawEmail);
    const ipHash = getIpHash(request, config.ipHashSecret);
    const limiter = await consumeRateLimit(
      database,
      "password_reset",
      subjectHash("password_reset", `${ipHash}:${email}`, config.ipHashSecret)
    );
    if (!limiter.allowed) throw rateLimitError(limiter.retryAfter);
    const user = await database.query(
      "SELECT id FROM admin_users WHERE email = $1 AND status = 'active' LIMIT 1",
      [email]
    );
    await recordAudit(database, {
      actorUserId: user.rows[0]?.id || null,
      actorLabel: "password-reset",
      action: "auth.password_reset.request",
      entityType: "admin_user",
      entityId: user.rows[0]?.id || null,
      metadata: { automatedDeliveryAvailable: false, ipHash },
    });
    return GENERIC_RESPONSE;
  }

  return { requestReset };
}
