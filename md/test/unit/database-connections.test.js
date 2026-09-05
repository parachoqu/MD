import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Pool } from "@neondatabase/serverless";
import {
  clearDatabaseForTests,
  createMaintenanceDatabase,
  getDatabase,
  setDatabaseForTests,
} from "../../server/database/index.js";
import { readMigrations } from "../../server/database/migrations.js";
import { getConfig } from "../../server/config.js";
import { currentSeedData } from "../../server/seed-data.js";

const ROOT = path.resolve(import.meta.dirname, "../..");
const POOLED = "postgresql://test:pooled-sentinel@pooled.example.test/test";
const DIRECT = "postgresql://test:direct-sentinel@direct.example.test/test";

function environment(context, values) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  function apply(entries) {
    for (const [key, value] of Object.entries(entries)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
  apply(values);
  clearDatabaseForTests();
  context.after(() => {
    apply(previous);
    clearDatabaseForTests();
  });
}

function capturePool(context) {
  const queried = [];
  const closed = [];
  context.mock.method(Pool.prototype, "query", async function () {
    queried.push(this.options.connectionString);
    return { rows: [{ connected: true }], rowCount: 1 };
  });
  context.mock.method(Pool.prototype, "end", async function () {
    closed.push(this.options.connectionString);
  });
  return { queried, closed };
}

test("runtime seleciona pooled e nao exige DATABASE_URL_UNPOOLED", async (context) => {
  environment(context, { DATABASE_URL: POOLED, DATABASE_URL_UNPOOLED: undefined });
  const observed = capturePool(context);
  assert.equal(getConfig({ requireDatabase: true, requireSecrets: false }).databaseUrl, POOLED);
  const database = getDatabase();
  assert.equal(getDatabase(), database);
  await database.query("SELECT 1");
  await database.close();
  assert.deepEqual(observed, { queried: [POOLED], closed: [POOLED] });
});

test("runtime nao substitui pooled ausente pela conexao direta", (context) => {
  environment(context, { DATABASE_URL: undefined, DATABASE_URL_UNPOOLED: DIRECT });
  assert.throws(() => getDatabase(), { message: "DATABASE_URL nao configurada" });
});

test("runtime continua pooled quando ambas as URLs estao presentes", async (context) => {
  environment(context, { DATABASE_URL: POOLED, DATABASE_URL_UNPOOLED: DIRECT });
  const observed = capturePool(context);
  const database = getDatabase();
  await database.query("SELECT 1");
  await database.close();
  assert.deepEqual(observed, { queried: [POOLED], closed: [POOLED] });
});

test("manutencao usa somente unpooled e nao compartilha o banco injetado no runtime", async (context) => {
  environment(context, { DATABASE_URL: POOLED, DATABASE_URL_UNPOOLED: DIRECT });
  const observed = capturePool(context);
  const injected = { query: async () => ({ rows: [] }) };
  setDatabaseForTests(injected);
  const first = createMaintenanceDatabase();
  const second = createMaintenanceDatabase();
  assert.notEqual(first, second);
  assert.equal(getDatabase(), injected);
  await first.query("SELECT 1");
  await second.query("SELECT 1");
  await first.close();
  await second.close();
  assert.deepEqual(observed, { queried: [DIRECT, DIRECT], closed: [DIRECT, DIRECT] });
});

test("unpooled ausente ou em branco falha sem conectar nem revelar pooled", (context) => {
  environment(context, { DATABASE_URL: POOLED, DATABASE_URL_UNPOOLED: undefined });
  const connect = context.mock.method(Pool.prototype, "connect", () => {
    assert.fail("Nao deve haver tentativa de conexao");
  });
  for (const value of [undefined, "", " \t "]) {
    if (value === undefined) delete process.env.DATABASE_URL_UNPOOLED;
    else process.env.DATABASE_URL_UNPOOLED = value;
    assert.throws(() => createMaintenanceDatabase(), {
      message: "DATABASE_URL_UNPOOLED nao configurada para manutencao",
    });
  }
  assert.equal(connect.mock.callCount(), 0);
});

test("manutencao rejeita URL invalida e endpoint Neon pooled sem revelar valores", (context) => {
  environment(context, { DATABASE_URL: POOLED, DATABASE_URL_UNPOOLED: undefined });
  const connect = context.mock.method(Pool.prototype, "connect", () => {
    assert.fail("Nao deve haver tentativa de conexao");
  });
  for (const value of [
    "direct-sentinel-invalido",
    "https://test:direct-sentinel@direct.example.test/test",
    "postgresql:///test?direct-sentinel",
  ]) {
    process.env.DATABASE_URL_UNPOOLED = value;
    assert.throws(() => createMaintenanceDatabase(), {
      message: "DATABASE_URL_UNPOOLED deve ser uma URL PostgreSQL direta valida",
    });
  }
  for (const hostname of ["ep-example-pooler.neon.tech", "EP-EXAMPLE-POOLER.neon.tech"]) {
    process.env.DATABASE_URL_UNPOOLED = `postgresql://test:direct-sentinel@${hostname}/test`;
    assert.throws(() => createMaintenanceDatabase(), {
      message: "DATABASE_URL_UNPOOLED deve usar o endpoint direto, sem pooler",
    });
  }
  assert.equal(connect.mock.callCount(), 0);
});

test("pool direto preserva commit, rollback, liberacao do cliente e fechamento", async (context) => {
  environment(context, { DATABASE_URL: POOLED, DATABASE_URL_UNPOOLED: DIRECT });
  const statements = [];
  let released = 0;
  const observed = capturePool(context);
  context.mock.method(Pool.prototype, "connect", async function () {
    assert.equal(this.options.connectionString, DIRECT);
    return {
      query: async (sql) => {
        statements.push(sql);
        return { rows: [], rowCount: 0 };
      },
      release: () => { released += 1; },
    };
  });
  const database = createMaintenanceDatabase();
  assert.equal(await database.transaction(async (tx) => {
    await tx.query("SELECT 1");
    return "concluido";
  }), "concluido");
  const failure = new Error("falha controlada");
  await assert.rejects(database.transaction(async (tx) => {
    await tx.exec("SELECT 2");
    throw failure;
  }), (error) => error === failure);
  await database.close();
  assert.deepEqual(statements, ["BEGIN", "SELECT 1", "COMMIT", "BEGIN", "SELECT 2", "ROLLBACK"]);
  assert.equal(released, 2);
  assert.deepEqual(observed.closed, [DIRECT]);
});

async function exportFixture(context) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "md-connection-tests-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const input = path.join(directory, "admin.json");
  await writeFile(input, JSON.stringify({
    schemaVersion: 1,
    exportedAt: "2026-09-05T12:00:00.000Z",
    ...currentSeedData(),
  }));
  return input;
}

test("todos os comandos de manutencao recusam pooled sozinho antes de prompts ou conexao", async (context) => {
  const input = await exportFixture(context);
  const env = { ...process.env, DATABASE_URL: POOLED, VERCEL_ENV: "preview", NODE_ENV: "test" };
  delete env.DATABASE_URL_UNPOOLED;
  const commands = [
    ["migrate.mjs"],
    ["seed.mjs"],
    ["create-admin.mjs"],
    ["export-data.mjs", "--output=-"],
    ["import-admin-export.mjs", `--input=${input}`, "--apply"],
  ];
  for (const [script, ...args] of commands) {
    const result = spawnSync(process.execPath, [`scripts/${script}`, ...args], {
      cwd: ROOT, env, encoding: "utf8", timeout: 10_000,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 1, script);
    assert.match(result.stderr, /DATABASE_URL_UNPOOLED nao configurada para manutencao/, script);
    assert.equal(result.stdout, "", script);
    assert.equal(result.stderr.includes(POOLED), false, script);
    assert.equal(result.stderr.includes("pooled-sentinel"), false, script);
  }
});

test("importacao dry-run permanece offline sem nenhuma URL de banco", async (context) => {
  const input = await exportFixture(context);
  const env = { ...process.env };
  delete env.DATABASE_URL;
  delete env.DATABASE_URL_UNPOOLED;
  const result = spawnSync(process.execPath, ["scripts/import-admin-export.mjs", `--input=${input}`], {
    cwd: ROOT, env, encoding: "utf8", timeout: 10_000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Exportacao valida \(dry-run\)/);
  assert.equal(result.stderr, "");
});

test("comando migrate usa direto e fecha o pool no sucesso e na falha", async (context) => {
  environment(context, { DATABASE_URL: POOLED, DATABASE_URL_UNPOOLED: DIRECT });
  const migrations = await readMigrations();
  const observed = capturePool(context);
  const failure = new Error("falha controlada de migration");
  let shouldFail = false;
  context.mock.method(Pool.prototype, "query", async function () {
    assert.equal(this.options.connectionString, DIRECT);
    if (shouldFail) throw failure;
    return { rows: migrations, rowCount: migrations.length };
  });
  const messages = [];
  context.mock.method(process.stdout, "write", (value) => {
    messages.push(value);
    return true;
  });
  await import("../../scripts/migrate.mjs?connection-test=success");
  shouldFail = true;
  await assert.rejects(import("../../scripts/migrate.mjs?connection-test=failure"), (error) => error === failure);
  assert.deepEqual(observed.closed, [DIRECT, DIRECT]);
  assert.deepEqual(messages, ["Migrations: 0 aplicada(s), 1 ja existente(s).\n"]);
});
