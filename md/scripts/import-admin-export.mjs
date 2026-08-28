import { readFile } from "node:fs/promises";
import path from "node:path";
import { getDatabase } from "../server/database/index.js";
import { migrateDatabase } from "../server/database/migrations.js";
import { importAdminExport, validateAdminExport } from "../server/services/admin-export-service.js";

function hasFlag(name) {
  return process.argv.slice(2).includes(`--${name}`);
}

function argument(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return inline ? inline.slice(prefix.length) : null;
}

const input = argument("input") || process.argv.slice(2).find((value) => !value.startsWith("--"));
if (!input) {
  throw new Error("Informe --input=/caminho/exportacao.json. Sem --apply, apenas a validacao e executada.");
}

const source = JSON.parse(await readFile(path.resolve(input), "utf8"));
const parsed = validateAdminExport(source);
if (!hasFlag("apply")) {
  const result = await importAdminExport(null, parsed, { dryRun: true });
  process.stdout.write(`Exportacao valida (dry-run): ${JSON.stringify(result.counts)}\n`);
  process.exit(0);
}

if (
  (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") &&
  argument("confirm-production") !== "IMPORTAR-PRODUCAO"
) {
  throw new Error("Production exige --confirm-production=IMPORTAR-PRODUCAO e confirmacao humana explicita.");
}

const database = getDatabase();
try {
  await migrateDatabase(database);
  const result = await importAdminExport(database, parsed, {
    trustExistingBlobUrls: hasFlag("trust-existing-blob-urls"),
  });
  process.stdout.write(`Importacao concluida: ${JSON.stringify(result)}\n`);
} finally {
  await database.close();
}
