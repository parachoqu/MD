import assert from "node:assert/strict";
import test from "node:test";
import { events } from "../../data/events.js";
import { createSessionService } from "../../server/auth/session-service.js";
import { migrateDatabase } from "../../server/database/migrations.js";
import { handleAdminRequest } from "../../server/http/admin-controller.js";
import { handleAuthRequest } from "../../server/http/auth-controller.js";
import { handlePublicRequest } from "../../server/http/public-controller.js";
import { PERMISSIONS, can, permissionsForRole } from "../../server/http/authorization.js";
import { apiHandler } from "../../server/http/response.js";
import { hashPassword } from "../../server/security/password.js";
import { createEventRepository } from "../../server/repositories/event-repository.js";
import { createRegistrationService } from "../../server/services/registration-service.js";
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

const ACCOUNTS = [
  { id: "rbac-admin", email: "admin.rbac@example.test", role: "admin", password: "Senha-RBAC-Admin-2026!" },
  { id: "rbac-editor", email: "editor.rbac@example.test", role: "editor", password: "Senha-RBAC-Editor-2026!" },
  { id: "rbac-organizer", email: "organizer.rbac@example.test", role: "organizer", password: "Senha-RBAC-Org-2026!" },
];

// Rotas de conteudo: admin e editor mantem o alcance que sempre tiveram,
// organizer precisa receber 403 em todas elas.
const CONTENT_ROUTES = [
  ["GET", "/api/admin/events"],
  ["GET", "/api/admin/projects"],
  ["GET", "/api/admin/content/home"],
  ["GET", "/api/admin/settings"],
  ["GET", "/api/admin/media"],
  ["GET", "/api/admin/activity"],
  ["GET", "/api/admin/contact-messages"],
];

function request(path, options = {}) {
  const headers = new Headers({
    Accept: "application/json",
    "user-agent": "md-rbac-test",
    "x-forwarded-for": "192.0.2.31",
    ...(options.origin === false ? {} : { Origin: config.appOrigin }),
    ...(options.headers || {}),
  });
  if (options.cookie) headers.set("Cookie", options.cookie);
  if (options.csrf) headers.set("X-CSRF-Token", options.csrf);
  const body = options.body === undefined ? undefined : JSON.stringify(options.body);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  return new Request(`${config.appOrigin}${path}`, { method: options.method || "GET", headers, body });
}

async function fixture(context) {
  const database = await createTestDatabase();
  context.after(() => database.close());
  await migrateDatabase(database);
  await applySeed(database);

  for (const account of ACCOUNTS) {
    await database.query(
      `INSERT INTO admin_users (id, email, name, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)`,
      [account.id, account.email, `Conta ${account.role}`, await hashPassword(account.password), account.role]
    );
  }

  // O seed ja cria o evento; abrir as inscricoes e publicar reaproveita a mesma
  // linha em vez de disputar o slug unico.
  const repository = createEventRepository(database);
  const current = await repository.getAdmin(events[0].id);
  const opened = await repository.update(
    events[0].id,
    { ...current, status: "open", capacity: { teams: 0, label: "" } },
    current.revision,
    null
  );
  await repository.publish(events[0].id, opened.revision, null);

  const registration = await createRegistrationService(database, config).submit(
    {
      eventSlug: events[0].slug,
      registrationType: "team",
      team: { name: "EQUIPE RBAC TESTE", city: "Itambacuri", state: "MG", institution: "" },
      responsible: { name: "RESPONSAVEL RBAC", email: "responsavel.rbac@example.test", phone: "33900000000", role: "" },
      categoryId: "junior-masculino",
      participants: [{ name: "ATLETA RBAC", birthDate: "2010-01-01", jerseyNumber: "7", role: "" }],
      staff: [],
      consent: true,
      regulationConsent: true,
      consentVersion: "privacy-v1",
    },
    "rbac-registration-0001"
  );

  const runtime = { config, database, sessions: createSessionService(database, config) };
  const api = {
    admin: apiHandler((value) => handleAdminRequest(value, runtime)),
    auth: apiHandler((value) => handleAuthRequest(value, runtime)),
    publicApi: apiHandler((value) => handlePublicRequest(value, runtime)),
  };

  async function signIn(email) {
    const account = ACCOUNTS.find((item) => item.email === email);
    const response = await api.auth(
      request("/api/auth/login", { method: "POST", body: { email: account.email, password: account.password } })
    );
    assert.equal(response.status, 200, `login de ${email} deveria funcionar`);
    const payload = await response.json();
    return {
      cookie: response.headers.get("set-cookie").split(";", 1)[0],
      csrf: payload.data.csrfToken,
      role: payload.data.user.role,
    };
  }

  return { database, api, signIn, registrationId: registration.data.registrationId };
}

test("a matriz de permissoes falha fechada para papel desconhecido", () => {
  assert.deepEqual(permissionsForRole("organizer"), [PERMISSIONS.REGISTRATIONS_READ, PERMISSIONS.REGISTRATIONS_WRITE]);
  assert.ok(permissionsForRole("admin").includes(PERMISSIONS.CONTENT_MANAGE));
  assert.ok(permissionsForRole("editor").includes(PERMISSIONS.CONTENT_MANAGE));

  assert.deepEqual(permissionsForRole("desconhecido"), []);
  assert.deepEqual(permissionsForRole(undefined), []);
  assert.deepEqual(permissionsForRole("constructor"), []);
  assert.equal(can({ role: "organizer" }, PERMISSIONS.CONTENT_MANAGE), false);
  assert.equal(can(null, PERMISSIONS.REGISTRATIONS_READ), false);
});

test("organizer opera inscricoes de ponta a ponta", async (context) => {
  const { api, signIn, registrationId } = await fixture(context);
  const session = await signIn("organizer.rbac@example.test");
  assert.equal(session.role, "organizer");

  const list = await api.admin(request("/api/admin/registrations", { cookie: session.cookie }));
  assert.equal(list.status, 200);
  const listBody = await list.json();
  assert.equal(listBody.data.mode, "page");
  assert.equal(listBody.data.items.length, 1);
  assert.ok(listBody.data.syncCursor);

  const metrics = await api.admin(request("/api/admin/registrations/metrics", { cookie: session.cookie }));
  assert.equal(metrics.status, 200);
  assert.equal((await metrics.json()).data.new, 1);

  const detail = await api.admin(request(`/api/admin/registrations/${registrationId}`, { cookie: session.cookie }));
  assert.equal(detail.status, 200);
  const current = (await detail.json()).data;

  const update = await api.admin(
    request(`/api/admin/registrations/${registrationId}/status`, {
      method: "PUT",
      cookie: session.cookie,
      csrf: session.csrf,
      body: { status: "reviewing", updatedAt: current.updatedAt },
    })
  );
  assert.equal(update.status, 200);
  assert.equal((await update.json()).data.status, "reviewing");
});

test("organizer recebe 403 em toda rota de conteudo", async (context) => {
  const { api, signIn } = await fixture(context);
  const session = await signIn("organizer.rbac@example.test");

  for (const [method, path] of CONTENT_ROUTES) {
    const response = await api.admin(request(path, { method, cookie: session.cookie }));
    assert.equal(response.status, 403, `${method} ${path} deveria ser 403 para organizer`);
    assert.equal((await response.json()).error.code, "FORBIDDEN");
  }

  // Mutacao com CSRF valido tambem para no 403, nao no CSRF.
  const create = await api.admin(
    request("/api/admin/events", {
      method: "POST",
      cookie: session.cookie,
      csrf: session.csrf,
      body: { data: { slug: "evento-proibido", title: "Proibido" } },
    })
  );
  assert.equal(create.status, 403);

  const upload = await api.admin(
    request("/api/admin/media/upload-token", {
      method: "POST",
      cookie: session.cookie,
      csrf: session.csrf,
      body: { type: "blob.generate-client-token", payload: {} },
    })
  );
  assert.equal(upload.status, 403);
});

test("admin e editor mantem o alcance anterior ao RBAC", async (context) => {
  const { api, signIn, registrationId } = await fixture(context);

  for (const email of ["admin.rbac@example.test", "editor.rbac@example.test"]) {
    const session = await signIn(email);
    for (const [method, path] of CONTENT_ROUTES) {
      const response = await api.admin(request(path, { method, cookie: session.cookie }));
      assert.equal(response.status, 200, `${method} ${path} deveria continuar 200 para ${email}`);
    }
    const registrations = await api.admin(request("/api/admin/registrations", { cookie: session.cookie }));
    assert.equal(registrations.status, 200);
    const detail = await api.admin(request(`/api/admin/registrations/${registrationId}`, { cookie: session.cookie }));
    assert.equal(detail.status, 200);
  }
});

test("autenticacao vem antes da autorizacao e o CSRF continua obrigatorio", async (context) => {
  const { api, signIn, registrationId } = await fixture(context);

  // Sem sessao a resposta e 401, nunca 403: o servidor nao revela permissao.
  const anonymous = await api.admin(request("/api/admin/registrations", { origin: false }));
  assert.equal(anonymous.status, 401);
  const anonymousContent = await api.admin(request("/api/admin/events", { origin: false }));
  assert.equal(anonymousContent.status, 401);

  const session = await signIn("organizer.rbac@example.test");
  const detail = await api.admin(request(`/api/admin/registrations/${registrationId}`, { cookie: session.cookie }));
  const current = (await detail.json()).data;

  const withoutCsrf = await api.admin(
    request(`/api/admin/registrations/${registrationId}/status`, {
      method: "PUT",
      cookie: session.cookie,
      body: { status: "confirmed", updatedAt: current.updatedAt },
    })
  );
  assert.equal(withoutCsrf.status, 403);

  const crossOrigin = await api.admin(
    request(`/api/admin/registrations/${registrationId}/status`, {
      method: "PUT",
      cookie: session.cookie,
      csrf: session.csrf,
      headers: { Origin: "https://atacante.example" },
      body: { status: "confirmed", updatedAt: current.updatedAt },
    })
  );
  assert.equal(crossOrigin.status, 403);
});

test("conflito de status responde 409 para a sessao desatualizada", async (context) => {
  const { api, signIn, registrationId } = await fixture(context);
  const first = await signIn("organizer.rbac@example.test");
  const second = await signIn("admin.rbac@example.test");

  const loaded = await api.admin(request(`/api/admin/registrations/${registrationId}`, { cookie: first.cookie }));
  const shared = (await loaded.json()).data;

  const winner = await api.admin(
    request(`/api/admin/registrations/${registrationId}/status`, {
      method: "PUT",
      cookie: first.cookie,
      csrf: first.csrf,
      body: { status: "reviewing", updatedAt: shared.updatedAt },
    })
  );
  assert.equal(winner.status, 200);

  const loser = await api.admin(
    request(`/api/admin/registrations/${registrationId}/status`, {
      method: "PUT",
      cookie: second.cookie,
      csrf: second.csrf,
      body: { status: "confirmed", updatedAt: shared.updatedAt },
    })
  );
  assert.equal(loser.status, 409);
  assert.equal((await loser.json()).error.code, "REVISION_CONFLICT");

  // Recarregar resolve o conflito sem sobrescrever cegamente.
  const reloaded = await api.admin(request(`/api/admin/registrations/${registrationId}`, { cookie: second.cookie }));
  const fresh = (await reloaded.json()).data;
  const retry = await api.admin(
    request(`/api/admin/registrations/${registrationId}/status`, {
      method: "PUT",
      cookie: second.cookie,
      csrf: second.csrf,
      body: { status: "confirmed", updatedAt: fresh.updatedAt },
    })
  );
  assert.equal(retry.status, 200);
});
