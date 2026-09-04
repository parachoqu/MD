import assert from "node:assert/strict";
import test from "node:test";
import { events } from "../../data/events.js";
import { migrateDatabase } from "../../server/database/migrations.js";
import { createEventRepository } from "../../server/repositories/event-repository.js";
import { createContactService } from "../../server/services/contact-service.js";
import { createRegistrationService } from "../../server/services/registration-service.js";
import { createTestDatabase } from "../helpers/pglite-database.js";

const config = {
  ipHashSecret: "i".repeat(64),
};
const now = new Date("2026-08-15T15:00:00.000Z");

async function fixture(context) {
  const database = await createTestDatabase();
  context.after(() => database.close());
  await migrateDatabase(database);
  return database;
}

function registration(overrides = {}) {
  return {
    eventSlug: "taca-vale-handebol-2026",
    registrationType: "team",
    team: { name: "Equipe Teste", city: "Itambacuri", state: "MG", institution: "" },
    responsible: {
      name: "Pessoa Responsavel",
      email: "responsavel@example.com",
      phone: "33999999999",
      role: "Tecnico",
    },
    categoryId: "junior-masculino",
    participants: [
      { name: "Atleta Um", birthDate: "2010-05-20", jerseyNumber: "10", role: "" },
      { name: "Atleta Dois", birthDate: "2010-03-18", jerseyNumber: "11", role: "" },
    ],
    staff: [],
    consent: true,
    regulationConsent: true,
    consentVersion: "privacy-v1",
    ...overrides,
  };
}

async function publishOpenEvent(database, capacity = null) {
  const source = structuredClone(events[0]);
  source.status = "open";
  if (capacity !== null) source.capacity = { teams: capacity, label: `Ate ${capacity} equipe(s)` };
  const repository = createEventRepository(database);
  const created = await repository.create(source, null, { id: source.id, slug: source.slug });
  await repository.publish(created.id, created.revision, null);
}

test("inscricao oficial e transacional, com protocolo e replay idempotente", async (context) => {
  const database = await fixture(context);
  await publishOpenEvent(database);
  const service = createRegistrationService(database, config, { clock: () => now });
  const first = await service.submit(registration(), "registration-test-0001");
  const replay = await service.submit(registration(), "registration-test-0001");

  assert.match(first.data.protocol, /^MD-20260815-[A-Z0-9]{8}$/);
  assert.equal(first.data.protocol.includes("DEMO"), false);
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.data, first.data);
  const counts = await Promise.all([
    database.query("SELECT count(*)::int AS count FROM registrations"),
    database.query("SELECT count(*)::int AS count FROM registration_responsibles"),
    database.query("SELECT count(*)::int AS count FROM registration_members"),
    database.query("SELECT count(*)::int AS count FROM registration_consents"),
  ]);
  assert.deepEqual(counts.map((result) => result.rows[0].count), [1, 1, 2, 3]);
});

test("mesma chave com outro payload e evento fechado sao recusados", async (context) => {
  const database = await fixture(context);
  await publishOpenEvent(database);
  const service = createRegistrationService(database, config, { clock: () => now });
  await service.submit(registration(), "registration-test-0002");
  await assert.rejects(
    service.submit(registration({ categoryId: "junior-feminino" }), "registration-test-0002"),
    (error) => error.code === "IDEMPOTENCY_CONFLICT"
  );

  const repository = createEventRepository(database);
  const current = await repository.getAdmin(events[0].id);
  const changed = await repository.update(events[0].id, { ...current, status: "closed" }, current.revision, null);
  await repository.publish(events[0].id, changed.revision, null);
  await assert.rejects(
    service.submit(registration(), "registration-test-closed"),
    (error) => error.code === "VALIDATION_ERROR" && Boolean(error.fields.eventSlug)
  );
});

test("capacidade e protegida dentro da transacao", async (context) => {
  const database = await fixture(context);
  await publishOpenEvent(database, 1);
  const service = createRegistrationService(database, config, { clock: () => now });
  await service.submit(registration(), "registration-capacity-1");
  await assert.rejects(
    service.submit(registration({ team: { name: "Outra", city: "Itambacuri", state: "MG", institution: "" } }), "registration-capacity-2"),
    (error) => error.code === "REVISION_CONFLICT" && /capacidade/i.test(error.message)
  );
});

test("contato persiste uma unica vez e rejeita chave reutilizada com outro conteudo", async (context) => {
  const database = await fixture(context);
  const service = createContactService(database, config, { clock: () => now });
  const payload = {
    name: "Pessoa Contato",
    email: "contato@example.com",
    phone: "",
    subject: "Projeto escolar",
    message: "Gostaria de conversar sobre um projeto.",
    consent: true,
    consentVersion: "privacy-v1",
    website: "",
  };
  const first = await service.submit(payload, "contact-test-0001");
  const replay = await service.submit(payload, "contact-test-0001");
  assert.equal(first.status, 201);
  assert.equal(replay.replayed, true);
  await assert.rejects(
    service.submit({ ...payload, subject: "Outro assunto" }, "contact-test-0001"),
    (error) => error.code === "IDEMPOTENCY_CONFLICT"
  );
  const messages = await database.query("SELECT status, message FROM contact_messages");
  assert.equal(messages.rows.length, 1);
  assert.equal(messages.rows[0].status, "new");
  assert.equal(messages.rows[0].message, payload.message);
});
