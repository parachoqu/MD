import assert from "node:assert/strict";
import test from "node:test";
import { migrateDatabase } from "../../server/database/migrations.js";
import { applySeed } from "../../server/services/seed-service.js";
import {
  createAdminExport,
  importAdminExport,
  validateAdminExport,
} from "../../server/services/admin-export-service.js";
import { createTestDatabase } from "../helpers/pglite-database.js";

async function databaseFixture(context) {
  const database = await createTestDatabase();
  context.after(() => database.close());
  await migrateDatabase(database);
  return database;
}

test("exportacao administrativa e versionada e nao inclui dados pessoais", async (context) => {
  const database = await databaseFixture(context);
  await applySeed(database);
  await database.query(
    `INSERT INTO contact_messages
      (id, name, email, subject, message, consent_version, consented_at,
       idempotency_key_hash, payload_hash)
     VALUES ('contact-private', 'Pessoa Privada', 'private@example.test', 'Contato',
             'Mensagem privada', 'privacy-v1', now(), 'key-private', 'payload-private')`
  );

  const exported = await createAdminExport(database, {
    clock: () => new Date("2026-08-28T12:00:00.000Z"),
  });
  assert.equal(exported.schemaVersion, 1);
  assert.equal(exported.events.length, 3);
  assert.equal(exported.projects.length, 3);
  assert.deepEqual(Object.keys(exported.content).sort(), ["catalog", "home"]);
  assert.doesNotThrow(() => validateAdminExport(exported));
  const serialized = JSON.stringify(exported);
  assert.equal(serialized.includes("private@example.test"), false);
  assert.equal(serialized.includes("Mensagem privada"), false);
});

test("importacao administrativa e transacional, idempotente e preserva publicacao", async (context) => {
  const sourceDatabase = await databaseFixture(context);
  await applySeed(sourceDatabase);
  const exported = await createAdminExport(sourceDatabase);

  const targetDatabase = await databaseFixture(context);
  const first = await importAdminExport(targetDatabase, exported);
  const second = await importAdminExport(targetDatabase, exported);

  assert.deepEqual(first.inserted, { media: 16, events: 3, projects: 3, content: 2, settings: 1 });
  assert.deepEqual(second.inserted, { media: 0, events: 0, projects: 0, content: 0, settings: 0 });
  const published = await targetDatabase.query(
    "SELECT count(*)::int AS count FROM events WHERE editorial_status = 'published' AND published_data IS NOT NULL"
  );
  assert.equal(published.rows[0].count, 3);
});

test("dry-run valida sem acessar banco e midia local exige fluxo explicito", async (context) => {
  const database = await databaseFixture(context);
  await applySeed(database);
  const exported = await createAdminExport(database);
  exported.media.push({
    id: "media-local-only",
    kind: "upload",
    provider: "local",
    path: "blob:local-preview",
    label: "Imagem local",
    alt: "Imagem disponivel apenas no navegador anterior",
    format: "webp",
  });
  const dryRun = await importAdminExport(null, exported, { dryRun: true });
  assert.equal(dryRun.valid, true);
  assert.equal(dryRun.counts.media, 17);

  const targetDatabase = await databaseFixture(context);
  const applied = await importAdminExport(targetDatabase, exported);
  assert.deepEqual(applied.pendingMedia, [{ id: "media-local-only", label: "Imagem local" }]);
});
