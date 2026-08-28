import assert from "node:assert/strict";
import test from "node:test";
import { migrateDatabase } from "../../server/database/migrations.js";
import { consumeRateLimit } from "../../server/security/rate-limit.js";
import { createTestDatabase } from "../helpers/pglite-database.js";

test("rate limit compartilhado bloqueia depois do limite", async (context) => {
  const database = await createTestDatabase();
  context.after(() => database.close());
  await migrateDatabase(database);
  const policy = { limit: 2, windowSeconds: 60, blockSeconds: 120 };
  const now = new Date("2026-08-28T12:00:00.000Z");
  assert.equal((await consumeRateLimit(database, "contact", "subject", { policy, now })).allowed, true);
  assert.equal((await consumeRateLimit(database, "contact", "subject", { policy, now })).allowed, true);
  const blocked = await consumeRateLimit(database, "contact", "subject", { policy, now });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfter, 120);
});
