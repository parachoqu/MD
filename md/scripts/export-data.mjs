import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDatabase } from "../server/database/index.js";
import { createAdminExport } from "../server/services/admin-export-service.js";

function argument(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return inline ? inline.slice(prefix.length) : null;
}

function defaultOutput() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.resolve("backups", `md-admin-${stamp}.json`);
}

const output = argument("output") || defaultOutput();
const database = getDatabase();

try {
  const exported = await createAdminExport(database);
  const json = `${JSON.stringify(exported, null, 2)}\n`;
  if (output === "-") {
    process.stdout.write(json);
  } else {
    const target = path.resolve(output);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, json, { encoding: "utf8", flag: "wx" });
    process.stdout.write(`Exportacao administrativa criada em ${target}.\n`);
  }
} finally {
  await database.close();
}
