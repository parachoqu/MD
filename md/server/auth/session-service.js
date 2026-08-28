import { randomToken, hmac, safeEqual } from "../security/crypto.js";
import { getIpHash, getUserAgentHash, parseCookies } from "../security/request.js";
import { verifyPassword } from "../security/password.js";
import { consumeRateLimit, subjectHash } from "../security/rate-limit.js";
import { recordAudit } from "../repositories/audit-repository.js";
import { forbiddenError, rateLimitError as httpRateLimitError, unauthorizedError } from "../http/errors.js";

export const SESSION_COOKIE = "md_admin_session";
const SESSION_TTL_SECONDS = 12 * 60 * 60;
const ROTATE_WHEN_SECONDS_LEFT = 60 * 60;
const DUMMY_PASSWORD_HASH =
  "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$HoI9AdHDBAJOrZH2petF6ja67mWaYCPuGUooJIIpJOh3JjgGWnZiFZXr7lgCtP8IGWZolm1ugcmnFg4XwqTvHw";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function sessionTokenHash(token, config) {
  return hmac(`session:${token}`, config.sessionSecret);
}

function csrfForHash(tokenHash, config) {
  return hmac(`csrf:${tokenHash}`, config.csrfSecret);
}

function publicUser(row) {
  return { id: row.user_id || row.id, email: row.email, name: row.name, role: row.role };
}

export function sessionCookie(token, config, maxAge = SESSION_TTL_SECONDS) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.max(0, Math.floor(maxAge))}`,
  ];
  if (config.production || config.appOrigin.startsWith("https://")) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(config) {
  return sessionCookie("", config, 0);
}

export function createSessionService(database, config) {
  async function insertSession(userId, request, rotatedFromId = null) {
    const token = randomToken(32);
    const tokenHash = sessionTokenHash(token, config);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
    const id = `session_${randomToken(12)}`;
    await database.query(
      `INSERT INTO admin_sessions
        (id, user_id, token_hash, created_at, last_seen_at, expires_at,
         ip_hash, user_agent_hash, rotated_from_id)
       VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8)`,
      [
        id,
        userId,
        tokenHash,
        now.toISOString(),
        expiresAt.toISOString(),
        getIpHash(request, config.ipHashSecret),
        getUserAgentHash(request, config.ipHashSecret),
        rotatedFromId,
      ]
    );
    return { id, token, tokenHash, expiresAt };
  }

  async function authenticate(request) {
    const token = parseCookies(request)[SESSION_COOKIE];
    if (!token || token.length < 32 || token.length > 256) throw unauthorizedError();
    const tokenHash = sessionTokenHash(token, config);
    const result = await database.query(
      `SELECT s.id AS session_id, s.user_id, s.token_hash, s.created_at,
              s.expires_at, u.email, u.name, u.role, u.status
       FROM admin_sessions s
       JOIN admin_users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.revoked_at IS NULL
         AND s.expires_at > now() AND u.status = 'active'
       LIMIT 1`,
      [tokenHash]
    );
    const session = result.rows[0];
    if (!session) throw unauthorizedError();
    await database.query(
      "UPDATE admin_sessions SET last_seen_at = now() WHERE id = $1 AND last_seen_at < now() - interval '5 minutes'",
      [session.session_id]
    );
    return { ...session, token, csrfToken: csrfForHash(session.token_hash, config), user: publicUser(session) };
  }

  async function signIn(credentials, request) {
    const email = normalizeEmail(credentials?.email);
    const password = String(credentials?.password || "");
    const ipHash = getIpHash(request, config.ipHashSecret);
    const limiter = await consumeRateLimit(
      database,
      "login",
      subjectHash("login", `${ipHash}:${email}`, config.ipHashSecret)
    );
    if (!limiter.allowed) throw httpRateLimitError(limiter.retryAfter);

    const result = await database.query(
      `SELECT id, email, name, role, status, password_hash
       FROM admin_users WHERE email = $1 LIMIT 1`,
      [email]
    );
    const user = result.rows[0] || null;
    const valid = await verifyPassword(password, user?.password_hash || DUMMY_PASSWORD_HASH);

    if (!user || user.status !== "active" || !valid) {
      await recordAudit(database, {
        actorUserId: user?.id || null,
        actorLabel: "login",
        action: "auth.login.failure",
        entityType: "admin_session",
        result: "failure",
        metadata: { ipHash },
      });
      const error = unauthorizedError();
      error.message = "Usuario ou senha invalidos.";
      throw error;
    }

    const session = await database.transaction(async (tx) => {
      const service = createSessionService(tx, config);
      const created = await service._insertSession(user.id, request);
      await tx.query("UPDATE admin_users SET last_login_at = now(), updated_at = now() WHERE id = $1", [user.id]);
      await recordAudit(tx, {
        actorUserId: user.id,
        action: "auth.login.success",
        entityType: "admin_session",
        entityId: created.id,
        metadata: { ipHash },
      });
      return created;
    });

    return {
      user: publicUser(user),
      csrfToken: csrfForHash(session.tokenHash, config),
      expiresAt: session.expiresAt.toISOString(),
      cookie: sessionCookie(session.token, config),
    };
  }

  async function signOut(request, session) {
    await database.transaction(async (tx) => {
      await tx.query("UPDATE admin_sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL", [session.session_id]);
      await recordAudit(tx, {
        actorUserId: session.user_id,
        action: "auth.logout",
        entityType: "admin_session",
        entityId: session.session_id,
      });
    });
    return { cookie: clearSessionCookie(config) };
  }

  async function sessionInfo(request) {
    const current = await authenticate(request);
    const secondsLeft = (new Date(current.expires_at).getTime() - Date.now()) / 1000;
    if (secondsLeft > ROTATE_WHEN_SECONDS_LEFT) {
      return {
        user: current.user,
        csrfToken: current.csrfToken,
        expiresAt: new Date(current.expires_at).toISOString(),
        cookie: null,
      };
    }

    const replacement = await database.transaction(async (tx) => {
      await tx.query("UPDATE admin_sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL", [current.session_id]);
      const service = createSessionService(tx, config);
      return service._insertSession(current.user_id, request, current.session_id);
    });
    return {
      user: current.user,
      csrfToken: csrfForHash(replacement.tokenHash, config),
      expiresAt: replacement.expiresAt.toISOString(),
      cookie: sessionCookie(replacement.token, config),
    };
  }

  function assertCsrf(request, session) {
    const token = request.headers.get("x-csrf-token") || "";
    if (!token || !safeEqual(token, session.csrfToken)) throw forbiddenError("Token CSRF ausente ou invalido.");
  }

  return {
    signIn,
    signOut,
    authenticate,
    sessionInfo,
    assertCsrf,
    _insertSession: insertSession,
  };
}
