import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const output = path.resolve(root, "../.vercel/output");
const expectedFunctions = [
  "api/admin/router.func",
  "api/auth/[action].func",
  "api/health.func",
  "api/public/router.func",
];
const forbiddenStatic = [
  "server",
  "scripts",
  "db",
  "docs",
  "test",
  "App Shell M&D_files",
  "package.json",
  "README.md",
  "README-BACKEND.md",
  ".env.example",
];

async function collectConfigs(directory, relative = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const found = [];
  for (const entry of entries) {
    const nextRelative = path.join(relative, entry.name);
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...(await collectConfigs(full, nextRelative)));
    if (entry.isFile() && entry.name === ".vc-config.json") {
      found.push(path.dirname(nextRelative).split(path.sep).join("/"));
    }
  }
  return found;
}

const functionsDirectory = path.join(output, "functions");
const actualFunctions = (await collectConfigs(functionsDirectory)).sort();
if (JSON.stringify(actualFunctions) !== JSON.stringify(expectedFunctions)) {
  throw new Error(`Functions inesperadas: ${JSON.stringify(actualFunctions)}`);
}

for (const functionPath of actualFunctions) {
  const config = JSON.parse(
    await readFile(path.join(functionsDirectory, functionPath, ".vc-config.json"), "utf8")
  );
  if (config.runtime !== "nodejs24.x") {
    throw new Error(`${functionPath} usa runtime inesperado: ${config.runtime}`);
  }
}

const deploymentConfig = JSON.parse(await readFile(path.join(output, "config.json"), "utf8"));
const serializedRoutes = JSON.stringify(deploymentConfig.routes || []);
for (const marker of ["/api/admin/router?__md_route=", "/api/public/router?__md_route="]) {
  if (!serializedRoutes.includes(marker)) throw new Error(`Rewrite ausente: ${marker}`);
}

const staticDirectory = path.join(output, "static");
for (const relative of forbiddenStatic) {
  try {
    await access(path.join(staticDirectory, relative));
    throw new Error(`Artefato indevido na saida estatica: ${relative}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

process.stdout.write(
  `Saida Vercel valida: ${actualFunctions.length} Functions Node 24, rewrites presentes e fontes server-side fora do estatico.\n`
);
