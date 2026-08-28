import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const output = path.join(root, ".vercel-static");
const publicEntries = [
  "index.html",
  "inscricoes.html",
  "evento.html",
  "regulamento-taca-vale-handebol-2026.html",
  "admin",
  "assets",
  "css",
  "data",
  "js",
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const entry of publicEntries) {
  await cp(path.join(root, entry), path.join(output, entry), { recursive: true });
}
process.stdout.write(`Artefato estatico criado com ${publicEntries.length} entrada(s) publicas.\n`);
