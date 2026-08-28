import assert from "node:assert/strict";
import test from "node:test";
import { migrateDatabase } from "../../server/database/migrations.js";
import { createTestDatabase } from "../helpers/pglite-database.js";

test("migration aplica em banco vazio e e idempotente", async (context) => {
  const database = await createTestDatabase();
  context.after(() => database.close());
  const first = await migrateDatabase(database);
  const second = await migrateDatabase(database);
  assert.deepEqual(first.map((item) => item.status), ["applied"]);
  assert.deepEqual(second.map((item) => item.status), ["already_applied"]);
  const tables = await database.query(
    "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public'"
  );
  assert.equal(tables.rows[0].count, 18);
});

test("constraints protegem slugs, revisoes e relacoes", async (context) => {
  const database = await createTestDatabase();
  context.after(() => database.close());
  await migrateDatabase(database);
  const draft = JSON.stringify({ slug: "evento-a", title: "Evento A" });
  await database.query(
    "INSERT INTO events (id, slug, draft_data) VALUES ($1, $2, $3::jsonb)",
    ["evt-a", "evento-a", draft]
  );
  await assert.rejects(
    database.query("INSERT INTO events (id, slug, draft_data) VALUES ($1, $2, $3::jsonb)", ["evt-b", "evento-a", draft])
  );
  await assert.rejects(
    database.query("UPDATE events SET published_revision = 2 WHERE id = $1", ["evt-a"])
  );
});

test("transaction faz rollback integral em falha", async (context) => {
  const database = await createTestDatabase();
  context.after(() => database.close());
  await migrateDatabase(database);
  await assert.rejects(
    database.transaction(async (tx) => {
      await tx.query(
        "INSERT INTO events (id, slug, draft_data) VALUES ($1, $2, $3::jsonb)",
        ["evt-rollback", "evento-rollback", JSON.stringify({ title: "Rollback" })]
      );
      throw new Error("falha intencional");
    })
  );
  const result = await database.query("SELECT count(*)::int AS count FROM events WHERE id = $1", ["evt-rollback"]);
  assert.equal(result.rows[0].count, 0);
});
