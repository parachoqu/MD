import assert from "node:assert/strict";
import test from "node:test";
import { createSessionService } from "../../server/auth/session-service.js";
import { migrateDatabase } from "../../server/database/migrations.js";
import { handleAdminRequest } from "../../server/http/admin-controller.js";
import { handleAuthRequest } from "../../server/http/auth-controller.js";
import { handlePublicRequest } from "../../server/http/public-controller.js";
import { apiHandler } from "../../server/http/response.js";
import { pathSegments } from "../../server/http/route-utils.js";
import { hashPassword } from "../../server/security/password.js";
import { applySeed } from "../../server/services/seed-service.js";
import { createTestDatabase } from "../helpers/pglite-database.js";

const config = {
  appOrigin: "https://md.example.test",
  production: true,
  sessionSecret: "s".repeat(64),
  csrfSecret: "c".repeat(64),
  ipHashSecret: "i".repeat(64),
  blobToken: "",
};

function request(path, options = {}) {
  const headers = new Headers({
    Accept: "application/json",
    "user-agent": "md-api-test",
    "x-forwarded-for": "192.0.2.25",
    ...(options.origin === false ? {} : { Origin: config.appOrigin }),
    ...(options.headers || {}),
  });
  const body = options.body === undefined ? undefined : JSON.stringify(options.body);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  return new Request(`${config.appOrigin}${path}`, {
    method: options.method || "GET",
    headers,
    body,
  });
}

async function body(response) {
  return response.json();
}

async function fixture(context) {
  const database = await createTestDatabase();
  context.after(() => database.close());
  await migrateDatabase(database);
  await applySeed(database);
  await database.query(
    `INSERT INTO admin_users (id, email, name, password_hash)
     VALUES ($1, $2, $3, $4)`,
    ["admin-http", "admin-http@example.test", "Admin HTTP", await hashPassword("Senha-HTTP-Forte-2026!")]
  );
  const runtime = { config, database, sessions: createSessionService(database, config) };
  return {
    database,
    auth: apiHandler((value) => handleAuthRequest(value, runtime)),
    admin: apiHandler((value) => handleAdminRequest(value, runtime)),
    publicApi: apiHandler((value) => handlePublicRequest(value, runtime)),
  };
}

async function login(api) {
  const response = await api.auth(
    request("/api/auth/login", {
      method: "POST",
      body: { email: "admin-http@example.test", password: "Senha-HTTP-Forte-2026!" },
    })
  );
  assert.equal(response.status, 200);
  const payload = await body(response);
  return {
    cookie: response.headers.get("set-cookie").split(";", 1)[0],
    csrfToken: payload.data.csrfToken,
  };
}

test("roteamento interno preserva todos os segmentos apos rewrite da Vercel", () => {
  const rewritten = new Request(
    `${config.appOrigin}/api/admin/router?__md_route=events/evt-teste/publish`
  );
  assert.deepEqual(pathSegments(rewritten, "/api/admin/"), ["events", "evt-teste", "publish"]);
});

test("API administrativa exige sessao e CSRF", async (context) => {
  const api = await fixture(context);
  const anonymous = await api.admin(request("/api/admin/events", { origin: false }));
  assert.equal(anonymous.status, 401);

  const session = await login(api);
  const loaded = await api.admin(
    request("/api/admin/events/evt-taca-vale-handebol-2026", {
      headers: { Cookie: session.cookie },
    })
  );
  assert.equal(loaded.status, 200);
  const current = (await body(loaded)).data;

  const missingCsrf = await api.admin(
    request(`/api/admin/events/${current.id}`, {
      method: "PUT",
      headers: { Cookie: session.cookie },
      body: { data: { ...current, summary: "Rascunho protegido" }, revision: current.revision },
    })
  );
  assert.equal(missingCsrf.status, 403);
});

test("publicacao via API altera o publico sem expor o rascunho", async (context) => {
  const api = await fixture(context);
  const session = await login(api);
  const headers = { Cookie: session.cookie, "X-CSRF-Token": session.csrfToken };
  const slug = "taca-vale-handebol-2026";
  const originalResponse = await api.publicApi(request(`/api/public/events/${slug}`, { origin: false }));
  const original = (await body(originalResponse)).data;

  const adminResponse = await api.admin(
    request("/api/admin/events/evt-taca-vale-handebol-2026", { headers })
  );
  const adminEvent = (await body(adminResponse)).data;
  const changedTitle = "Titulo somente no rascunho HTTP";
  const updateResponse = await api.admin(
    request(`/api/admin/events/${adminEvent.id}`, {
      method: "PUT",
      headers,
      body: { data: { ...adminEvent, title: changedTitle }, revision: adminEvent.revision },
    })
  );
  assert.equal(updateResponse.status, 200);
  const updated = (await body(updateResponse)).data;
  const beforePublish = await api.publicApi(request(`/api/public/events/${slug}`, { origin: false }));
  assert.equal((await body(beforePublish)).data.title, original.title);

  const publishResponse = await api.admin(
    request(`/api/admin/events/${adminEvent.id}/publish`, {
      method: "POST",
      headers,
      body: { revision: updated.revision },
    })
  );
  assert.equal(publishResponse.status, 200);
  const afterPublish = await api.publicApi(request(`/api/public/events/${slug}`, { origin: false }));
  assert.equal((await body(afterPublish)).data.title, changedTitle);
});

test("contato publico exige origem e idempotencia e fica disponivel no admin", async (context) => {
  const api = await fixture(context);
  const payload = {
    name: "Pessoa API",
    email: "pessoa-api@example.test",
    phone: "",
    subject: "Projeto escolar",
    message: "Gostaria de conversar sobre uma atividade.",
    consent: true,
    consentVersion: "privacy-v1",
    website: "",
  };
  const withoutOrigin = await api.publicApi(
    request("/api/public/contact", {
      method: "POST",
      origin: false,
      headers: { "Idempotency-Key": "contact-http-origin" },
      body: payload,
    })
  );
  assert.equal(withoutOrigin.status, 403);

  const first = await api.publicApi(
    request("/api/public/contact", {
      method: "POST",
      headers: { "Idempotency-Key": "contact-http-success" },
      body: payload,
    })
  );
  assert.equal(first.status, 201);
  const replay = await api.publicApi(
    request("/api/public/contact", {
      method: "POST",
      headers: { "Idempotency-Key": "contact-http-success" },
      body: payload,
    })
  );
  assert.equal(replay.status, 201);
  assert.equal(replay.headers.get("idempotency-replayed"), "true");

  const session = await login(api);
  const contacts = await api.admin(
    request("/api/admin/contact-messages", { headers: { Cookie: session.cookie } })
  );
  const items = (await body(contacts)).data;
  assert.equal(items.length, 1);
  assert.equal(items[0].email, payload.email);
});
