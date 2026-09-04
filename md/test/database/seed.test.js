import assert from "node:assert/strict";
import test from "node:test";
import { migrateDatabase } from "../../server/database/migrations.js";
import { createContentRepository } from "../../server/repositories/content-repository.js";
import { createEventRepository } from "../../server/repositories/event-repository.js";
import { applySeed } from "../../server/services/seed-service.js";
import { createTestDatabase } from "../helpers/pglite-database.js";

test("seed atual e publicado, transacional e idempotente", async (context) => {
  const database = await createTestDatabase();
  context.after(() => database.close());
  await migrateDatabase(database);
  const first = await applySeed(database);
  const second = await applySeed(database);

  assert.equal(first.events, 1);
  assert.equal(first.projects, 3);
  assert.equal(first.content, 2);
  assert.equal(first.settings, 1);
  assert.ok(first.media > 0);
  assert.deepEqual(second, { media: 0, events: 0, projects: 0, content: 0, settings: 0 });

  const events = await createEventRepository(database).listPublic();
  const bootstrap = await createContentRepository(database).publicBootstrap();
  assert.equal(events.length, 1);
  assert.equal(bootstrap.projects.length, 3);
  assert.ok(bootstrap.pages.home);
  assert.equal(bootstrap.settings.organizationName, "M&D Projetos e Eventos Desportivos");
  const usages = await database.query("SELECT count(*)::int AS count FROM media_usages");
  assert.ok(usages.rows[0].count > 0);
});
