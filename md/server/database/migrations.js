import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../db/migrations"
);

function checksum(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

export async function readMigrations(directory = DEFAULT_DIRECTORY) {
  const filenames = (await readdir(directory))
    .filter((name) => /^\d+_[a-z0-9_-]+\.sql$/i.test(name))
    .sort((a, b) => a.localeCompare(b));

  return Promise.all(
    filenames.map(async (filename) => {
      const sql = await readFile(path.join(directory, filename), "utf8");
      const [version] = filename.split("_", 1);
      return { version, name: filename, sql, checksum: checksum(sql) };
    })
  );
}

export async function migrateDatabase(database, options = {}) {
  await database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      name text NOT NULL,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const migrations = await readMigrations(options.directory);
  const applied = await database.query(
    "SELECT version, name, checksum FROM schema_migrations ORDER BY version"
  );
  const byVersion = new Map(applied.rows.map((row) => [String(row.version), row]));
  const completed = [];

  for (const migration of migrations) {
    const existing = byVersion.get(migration.version);
    if (existing) {
      if (existing.checksum !== migration.checksum || existing.name !== migration.name) {
        throw new Error(`Migration ${migration.version} foi alterada depois de aplicada`);
      }
      completed.push({ ...migration, status: "already_applied" });
      continue;
    }

    await database.transaction(async (tx) => {
      await tx.exec(migration.sql);
      await tx.query(
        "INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)",
        [migration.version, migration.name, migration.checksum]
      );
    });
    completed.push({ ...migration, status: "applied" });
  }

  return completed.map(({ version, name, checksum: hash, status }) => ({
    version,
    name,
    checksum: hash,
    status,
  }));
}
