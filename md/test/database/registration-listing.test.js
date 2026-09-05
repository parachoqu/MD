import assert from "node:assert/strict";
import test from "node:test";
import { events } from "../../data/events.js";
import { migrateDatabase } from "../../server/database/migrations.js";
import { createEventRepository } from "../../server/repositories/event-repository.js";
import { createRegistrationService } from "../../server/services/registration-service.js";
import { createSubmissionAdminService, encodeCursor } from "../../server/services/submission-admin-service.js";
import { createTestDatabase } from "../helpers/pglite-database.js";

const config = { ipHashSecret: "i".repeat(64) };
const BASE_TIME = new Date("2026-08-15T15:00:00.000Z");

function submission(teamName, overrides = {}) {
  return {
    eventSlug: "taca-vale-handebol-2026",
    registrationType: "team",
    team: { name: teamName, city: "Itambacuri", state: "MG", institution: "" },
    responsible: {
      name: `RESPONSAVEL ${teamName}`,
      email: "responsavel.teste@example.test",
      phone: "33900000000",
      role: "Tecnico",
    },
    categoryId: "junior-masculino",
    participants: [
      { name: "ATLETA UM TESTE", birthDate: "2010-05-20", jerseyNumber: "10", role: "" },
      { name: "ATLETA DOIS TESTE", birthDate: "2010-03-18", jerseyNumber: "11", role: "" },
    ],
    staff: [],
    consent: true,
    regulationConsent: true,
    consentVersion: "privacy-v1",
    ...overrides,
  };
}

async function fixture(context, { count = 0 } = {}) {
  const database = await createTestDatabase();
  context.after(() => database.close());
  await migrateDatabase(database);

  const source = structuredClone(events[0]);
  source.status = "open";
  // Sem teto de vagas: este teste mede paginacao, nao capacidade.
  delete source.capacity;
  const repository = createEventRepository(database);
  const created = await repository.create(source, null, { id: source.id, slug: source.slug });
  await repository.publish(created.id, created.revision, null);

  const service = createSubmissionAdminService(database);
  const created_ = [];
  for (let index = 0; index < count; index += 1) {
    // Um segundo entre inscricoes para a ordem por created_at ser deterministica.
    const clock = new Date(BASE_TIME.getTime() + index * 1000);
    const registrations = createRegistrationService(database, config, { clock: () => clock });
    const result = await registrations.submit(
      submission(`EQUIPE TESTE ${String(index).padStart(2, "0")}`),
      `listing-test-${String(index).padStart(4, "0")}`
    );
    created_.push(result.data);
  }
  return { database, service, created: created_ };
}

test("paginacao por keyset percorre toda a base sem repetir nem pular", async (context) => {
  const { service, created } = await fixture(context, { count: 7 });

  const seen = [];
  let cursor = null;
  let pages = 0;
  do {
    const page = await service.listRegistrations({ limit: 3, cursor: cursor || undefined });
    assert.equal(page.mode, "page");
    assert.ok(page.items.length <= 3);
    seen.push(...page.items.map((item) => item.id));
    cursor = page.nextCursor;
    pages += 1;
    assert.ok(pages <= 5, "paginacao nao deve entrar em laco");
  } while (cursor);

  assert.equal(seen.length, 7);
  assert.equal(new Set(seen).size, 7, "nenhuma inscricao pode aparecer duas vezes");
  assert.deepEqual(new Set(seen), new Set(created.map((item) => item.registrationId)));

  // A ordem e da mais recente para a mais antiga.
  const listed = await service.listRegistrations({ limit: 100 });
  const timestamps = listed.items.map((item) => item.createdAt);
  assert.deepEqual(timestamps, [...timestamps].sort().reverse());
});

test("limite respeita o teto e o padrao do servidor", async (context) => {
  const { service } = await fixture(context, { count: 3 });
  assert.equal((await service.listRegistrations({})).limit, 50);
  assert.equal((await service.listRegistrations({ limit: "500" })).limit, 100);
  assert.equal((await service.listRegistrations({ limit: "0" })).limit, 1);
  assert.equal((await service.listRegistrations({ limit: "abc" })).limit, 50);
});

test("cursor invalido e recusado com 422 em vez de virar consulta silenciosa", async (context) => {
  const { service } = await fixture(context, { count: 1 });
  await assert.rejects(
    service.listRegistrations({ cursor: "nao-e-cursor!!" }),
    (error) => error.status === 422 && Boolean(error.fields.cursor)
  );
  await assert.rejects(
    service.listRegistrations({ sync: Buffer.from("sem-separador", "utf8").toString("base64url") }),
    (error) => error.status === 422
  );
});

test("cursor incremental traz apenas o que mudou desde a ultima sincronizacao", async (context) => {
  const { database, service } = await fixture(context, { count: 3 });

  const first = await service.listRegistrations({ limit: 50 });
  assert.ok(first.syncCursor, "a primeira pagina precisa devolver a marca d'agua");

  const empty = await service.listRegistrations({ sync: first.syncCursor });
  assert.equal(empty.mode, "sync");
  assert.deepEqual(empty.items, []);
  assert.equal(empty.syncCursor, first.syncCursor, "sem novidade o cursor nao pode andar sozinho");

  const target = first.items[first.items.length - 1];
  await service.updateRegistrationStatus(target.id, "confirmed", null, null);

  const afterUpdate = await service.listRegistrations({ sync: first.syncCursor });
  assert.deepEqual(afterUpdate.items.map((item) => item.id), [target.id]);
  assert.equal(afterUpdate.items[0].status, "confirmed");
  assert.notEqual(afterUpdate.syncCursor, first.syncCursor);

  // O cursor avancado nao devolve o mesmo registro outra vez.
  const settled = await service.listRegistrations({ sync: afterUpdate.syncCursor });
  assert.deepEqual(settled.items, []);

  const remaining = await database.query("SELECT count(*)::int AS count FROM registrations");
  assert.equal(remaining.rows[0].count, 3);
});

test("empate de horario nao faz o cursor pular nem repetir registro", async (context) => {
  const { database, service } = await fixture(context, { count: 3 });

  // Tres inscricoes com o MESMO updated_at: so o desempate por id evita perda.
  const sameMoment = "2026-08-20T10:00:00.000000+00:00";
  await database.query("UPDATE registrations SET updated_at = $1::timestamptz", [sameMoment]);

  const ordered = await database.query("SELECT id FROM registrations ORDER BY id ASC");
  const ids = ordered.rows.map((row) => row.id);
  assert.equal(ids.length, 3);

  const cursorAtFirst = encodeCursor("2026-08-20T10:00:00.000000Z", ids[0]);
  const afterFirst = await service.listRegistrations({ sync: cursorAtFirst, limit: 50 });
  assert.deepEqual(afterFirst.items.map((item) => item.id), ids.slice(1));

  const cursorAtLast = encodeCursor("2026-08-20T10:00:00.000000Z", ids[2]);
  const afterLast = await service.listRegistrations({ sync: cursorAtLast, limit: 50 });
  assert.deepEqual(afterLast.items, []);

  // Paginado em duas rodadas, o conjunto continua completo e sem repeticao.
  const firstBatch = await service.listRegistrations({ sync: cursorAtFirst, limit: 1 });
  assert.equal(firstBatch.hasMore, true);
  const secondBatch = await service.listRegistrations({ sync: firstBatch.syncCursor, limit: 1 });
  assert.deepEqual(
    [...firstBatch.items, ...secondBatch.items].map((item) => item.id),
    ids.slice(1)
  );
});

test("filtros e pesquisa sao parametrizados e nao viram curinga", async (context) => {
  const { database, service, created } = await fixture(context, { count: 4 });

  await database.query("UPDATE registrations SET status = 'confirmed' WHERE id = $1", [created[0].registrationId]);
  await database.query("UPDATE registrations SET category_id = 'junior-feminino' WHERE id = $1", [created[1].registrationId]);
  await database.query("UPDATE registrations SET team_data = $2::jsonb WHERE id = $1", [
    created[2].registrationId,
    JSON.stringify({ name: "EQUIPE 100% TESTE", city: "Itambacuri", state: "MG", institution: "" }),
  ]);

  assert.deepEqual(
    (await service.listRegistrations({ status: "confirmed" })).items.map((item) => item.id),
    [created[0].registrationId]
  );
  assert.deepEqual(
    (await service.listRegistrations({ categoryId: "junior-feminino" })).items.map((item) => item.id),
    [created[1].registrationId]
  );
  assert.equal((await service.listRegistrations({ eventId: "nao-existe" })).items.length, 0);
  assert.equal((await service.listRegistrations({ eventId: events[0].id })).items.length, 4);

  // Termo literal com curinga do LIKE precisa casar so o texto exato.
  const literal = await service.listRegistrations({ query: "100%" });
  assert.deepEqual(literal.items.map((item) => item.id), [created[2].registrationId]);

  const underscore = await service.listRegistrations({ query: "EQUIPE_TESTE" });
  assert.equal(underscore.items.length, 0, "o sublinhado nao pode casar qualquer caractere");

  const byProtocol = await service.listRegistrations({ query: created[3].protocol });
  assert.deepEqual(byProtocol.items.map((item) => item.id), [created[3].registrationId]);

  const byResponsible = await service.listRegistrations({ query: "RESPONSAVEL EQUIPE TESTE 01" });
  assert.deepEqual(byResponsible.items.map((item) => item.id), [created[1].registrationId]);

  // Uma aspa simples nao pode quebrar a consulta.
  const injection = await service.listRegistrations({ query: "' OR 1=1 --" });
  assert.equal(injection.items.length, 0);
});

test("metricas contam por status sem expor dado pessoal", async (context) => {
  const { database, service, created } = await fixture(context, { count: 5 });

  await database.query("UPDATE registrations SET status = 'confirmed' WHERE id = ANY($1::text[])", [
    [created[0].registrationId, created[1].registrationId],
  ]);
  await database.query("UPDATE registrations SET status = 'rejected' WHERE id = $1", [created[2].registrationId]);

  const metrics = await service.registrationMetrics({});
  assert.deepEqual(metrics, { total: 5, new: 2, reviewing: 0, confirmed: 2, cancelled: 0, rejected: 1 });

  const serialized = JSON.stringify(metrics);
  assert.equal(serialized.includes("@"), false);
  assert.equal(serialized.includes("3390"), false);

  // O filtro de evento vale para as metricas; o de status nao, senao a contagem some.
  assert.equal((await service.registrationMetrics({ eventId: events[0].id })).total, 5);
  assert.equal((await service.registrationMetrics({ eventId: "nao-existe" })).total, 0);
  assert.equal((await service.registrationMetrics({ status: "confirmed" })).total, 5);
});

test("a listagem carrega o minimo: sem e-mail, telefone ou nascimento", async (context) => {
  const { service, created } = await fixture(context, { count: 1 });

  const page = await service.listRegistrations({});
  const item = page.items[0];

  assert.deepEqual(Object.keys(item).sort(), [
    "categoryId",
    "createdAt",
    "eventId",
    "eventSlug",
    "eventTitle",
    "id",
    "participantCount",
    "protocol",
    "registrationType",
    "responsibleName",
    "staffCount",
    "status",
    "teamCity",
    "teamName",
    "teamState",
    "updatedAt",
  ]);
  assert.equal(item.participantCount, 2);
  assert.equal(item.staffCount, 0);

  const serialized = JSON.stringify(page.items);
  assert.equal(serialized.includes("responsavel.teste@example.test"), false);
  assert.equal(serialized.includes("33900000000"), false);
  assert.equal(serialized.includes("2010-05-20"), false);

  // O detalhe autenticado continua sendo o unico lugar com a ficha completa.
  const detail = await service.getRegistration(created[0].registrationId);
  assert.equal(detail.responsibles[0].email, "responsavel.teste@example.test");
  assert.equal(detail.members.length, 2);
  assert.equal(detail.members[0].birthDate, "2010-05-20");
});

test("mudanca de status usa concorrencia otimista por updatedAt", async (context) => {
  const { service, created } = await fixture(context, { count: 1 });
  const id = created[0].registrationId;

  const before = await service.getRegistration(id);
  const updated = await service.updateRegistrationStatus(id, "reviewing", before.updatedAt, null);
  assert.equal(updated.status, "reviewing");

  // Segunda sessao ainda com a versao antiga: precisa recarregar antes de gravar.
  await assert.rejects(
    service.updateRegistrationStatus(id, "confirmed", before.updatedAt, null),
    (error) => error.status === 409 && error.code === "REVISION_CONFLICT"
  );

  const fresh = await service.getRegistration(id);
  const retried = await service.updateRegistrationStatus(id, "confirmed", fresh.updatedAt, null);
  assert.equal(retried.status, "confirmed");

  await assert.rejects(
    service.updateRegistrationStatus(id, "invalido", null, null),
    (error) => error.status === 422
  );
  await assert.rejects(
    service.updateRegistrationStatus("registration_inexistente", "new", null, null),
    (error) => error.status === 404
  );
});
