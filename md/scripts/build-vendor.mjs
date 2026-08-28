import { mkdir } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

const root = path.resolve(import.meta.dirname, "..");
const outputDirectory = path.join(root, "admin/js/vendor");
await mkdir(outputDirectory, { recursive: true });
await build({
  entryPoints: [path.join(root, "scripts/vendor/vercel-blob-client-entry.js")],
  outfile: path.join(outputDirectory, "vercel-blob-client.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  minify: true,
  legalComments: "none",
  banner: { js: "/* Gerado por npm run build:vendor. Nao editar manualmente. */" },
});
process.stdout.write("Vendor do Vercel Blob atualizado.\n");
