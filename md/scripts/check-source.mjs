import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SKIP = new Set(["node_modules", ".vercel", ".vercel-static", "coverage"]);

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (SKIP.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(fullPath)));
    if (entry.isFile() && /\.(?:js|mjs)$/.test(entry.name)) files.push(fullPath);
  }
  return files;
}

const files = await collect(ROOT);
const failures = [];

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) failures.push({ file: path.relative(ROOT, file), output: result.stderr || result.stdout });
}

if (failures.length) {
  failures.forEach(({ file, output }) => process.stderr.write(`${file}\n${output}\n`));
  process.exitCode = 1;
} else {
  process.stdout.write(`JavaScript syntax: ${files.length} arquivo(s) validado(s).\n`);
}
