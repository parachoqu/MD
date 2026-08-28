import assert from "node:assert/strict";
import test from "node:test";
import { createSessionService, SESSION_COOKIE } from "../../server/auth/session-service.js";
import { migrateDatabase } from "../../server/database/migrations.js";
import { hashPassword } from "../../server/security/password.js";
import { createTestDatabase } from "../helpers/pglite-database.js";

const config = {
  appOrigin: "https://md.example.test",
  production: true,
  sessionSecret: "s".repeat(64),
  csrfSecret: "c".repeat(64),
  ipHashSecret: "i".repeat(64),
};

function request(options = {}) {
  const headers = new Headers({
    origin: config.appOrigin,
    "user-agent": "md-test",
    "x-forwarded-for": "192.0.2.10",
    ...(options.headers || {}),
  });
  return new Request(`${config.appOrigin}/api/auth/login`, { method: options.method || "POST", headers });
}

function cookieValue(setCookie) {
  return setCookie.split(";", 1)[0];
}

async function fixture(context) {
  const database = await createTestDatabase();
  context.after(() => database.close());
  await migrateDatabase(database);
  await database.query(
    `INSERT INTO admin_users (id, email, name, password_hash)
     VALUES ($1, $2, $3, $4)`,
    ["admin-test", "admin@example.com", "Admin Teste", await hashPassword("Senha-Muito-Forte-2026!")]
  );
  return database;
}

test("login valido cria somente hash no banco e sessao autenticavel", async (context) => {
  const database = await fixture(context);
  const service = createSessionService(database, config);
  const signedIn = await service.signIn(
    { email: "admin@example.com", password: "Senha-Muito-Forte-2026!" },
    request()
  );
  assert.match(signedIn.cookie, /HttpOnly/);
  assert.match(signedIn.cookie, /Secure/);
  assert.match(signedIn.cookie, /SameSite=Strict/);
  const token = decodeURIComponent(cookieValue(signedIn.cookie).split("=")[1]);
  const stored = await database.query("SELECT token_hash FROM admin_sessions");
  assert.equal(stored.rows.length, 1);
  assert.notEqual(stored.rows[0].token_hash, token);

  const session = await service.authenticate(request({ headers: { cookie: cookieValue(signedIn.cookie) } }));
  assert.equal(session.user.email, "admin@example.com");
  assert.equal(session.csrfToken, signedIn.csrfToken);
});

test("login invalido usa resposta generica", async (context) => {
  const database = await fixture(context);
  const service = createSessionService(database, config);
  for (const credentials of [
    { email: "missing@example.com", password: "Senha-Muito-Forte-2026!" },
    { email: "admin@example.com", password: "senha-incorreta" },
  ]) {
    await assert.rejects(
      service.signIn(credentials, request()),
      (error) => error.status === 401 && error.message === "Usuario ou senha invalidos."
    );
  }
});

test("CSRF, revogacao, expiracao e logout falham fechados", async (context) => {
  const database = await fixture(context);
  const service = createSessionService(database, config);
  const signedIn = await service.signIn(
    { email: "admin@example.com", password: "Senha-Muito-Forte-2026!" },
    request()
  );
  const cookie = cookieValue(signedIn.cookie);
  const authenticated = await service.authenticate(request({ headers: { cookie } }));
  assert.throws(() => service.assertCsrf(request({ headers: { cookie } }), authenticated), (error) => error.status === 403);
  assert.throws(
    () => service.assertCsrf(request({ headers: { cookie, "x-csrf-token": "wrong" } }), authenticated),
    (error) => error.status === 403
  );
  service.assertCsrf(request({ headers: { cookie, "x-csrf-token": signedIn.csrfToken } }), authenticated);

  const logout = await service.signOut(request(), authenticated);
  assert.match(logout.cookie, /Max-Age=0/);
  await assert.rejects(service.authenticate(request({ headers: { cookie } })), (error) => error.status === 401);

  const second = await service.signIn(
    { email: "admin@example.com", password: "Senha-Muito-Forte-2026!" },
    request()
  );
  await database.query(
    "UPDATE admin_sessions SET created_at = now() - interval '13 hours', expires_at = now() - interval '1 second' WHERE revoked_at IS NULL"
  );
  await assert.rejects(
    service.authenticate(request({ headers: { cookie: cookieValue(second.cookie) } })),
    (error) => error.status === 401
  );
});
