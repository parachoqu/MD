import assert from "node:assert/strict";
import test from "node:test";
import { migrateDatabase } from "../../server/database/migrations.js";
import { createEventRepository } from "../../server/repositories/event-repository.js";
import { createMediaRepository } from "../../server/repositories/media-repository.js";
import { createBlobService, matchesImageSignature } from "../../server/storage/blob-service.js";
import { events } from "../../data/events.js";
import { createTestDatabase } from "../helpers/pglite-database.js";

const config = {
  appOrigin: "https://md.example.test",
  blobToken: "vercel_blob_rw_fictitious",
  sessionSecret: "s".repeat(64),
};

async function fixture(context) {
  const database = await createTestDatabase();
  context.after(() => database.close());
  await migrateDatabase(database);
  return database;
}

function metadata(overrides = {}) {
  return {
    id: "media-upload-test",
    label: "Imagem de teste",
    alt: "Descricao alternativa da imagem de teste",
    originalFilename: "imagem.jpg",
    mimeType: "image/jpeg",
    size: 1234,
    width: 1200,
    height: 800,
    operation: "upload",
    ...overrides,
  };
}

async function tokenFor(database, meta, pathname, operation = "upload") {
  let authorization;
  const service = createBlobService(database, config, {
    handleUpload: async (options) => {
      authorization = await options.onBeforeGenerateToken(pathname, JSON.stringify(meta), false);
      return { type: "blob.generate-client-token", clientToken: "client-token" };
    },
  });
  const result = await service.handle(
    new Request(`${config.appOrigin}/api/admin/media/upload-token`, { method: "POST" }),
    { type: "blob.generate-client-token" },
    { user_id: null },
    { operation, mediaId: operation === "replace" ? meta.id : undefined }
  );
  assert.equal(result.clientToken, "client-token");
  assert.deepEqual(authorization.allowedContentTypes, ["image/jpeg", "image/png", "image/webp"]);
  assert.equal(authorization.maximumSizeInBytes, 5 * 1024 * 1024);
  return authorization.tokenPayload;
}

test("assinaturas JPEG, PNG e WebP sao verificadas sem aceitar MIME divergente", () => {
  assert.equal(matchesImageSignature(Uint8Array.from([0xff, 0xd8, 0xff, 0x00]), "image/jpeg"), true);
  assert.equal(matchesImageSignature(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png"), true);
  assert.equal(matchesImageSignature(Uint8Array.from([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]), "image/webp"), true);
  assert.equal(matchesImageSignature(Uint8Array.from([0xff, 0xd8, 0xff]), "image/png"), false);
  assert.equal(matchesImageSignature(Uint8Array.from([60, 115, 118, 103]), "image/svg+xml"), false);
});

test("upload direto grava metadados somente depois do callback validado", async (context) => {
  const database = await fixture(context);
  const meta = metadata();
  const pathname = `md-media/${meta.id}/asset-test.jpg`;
  const tokenPayload = await tokenFor(database, meta, pathname);
  const removed = [];
  const service = createBlobService(database, config, {
    head: async () => ({ pathname, contentType: meta.mimeType, size: meta.size }),
    inspectImage: async () => true,
    del: async (url) => removed.push(url),
  });
  await service.completeUpload({
    tokenPayload,
    blob: { pathname, contentType: meta.mimeType, url: "https://blob.example.test/asset-test.jpg" },
  });
  const item = await createMediaRepository(database).get(meta.id);
  assert.equal(item.kind, "upload");
  assert.equal(item.sizeBytes, meta.size);
  assert.equal(item.width, meta.width);
  assert.equal(item.revision, 1);
  assert.deepEqual(removed, []);
});

test("substituicao preserva id, incrementa revisao e limpa Blob anterior", async (context) => {
  const database = await fixture(context);
  const first = metadata();
  const firstPath = `md-media/${first.id}/first.jpg`;
  const firstToken = await tokenFor(database, first, firstPath);
  const firstService = createBlobService(database, config, {
    head: async () => ({ pathname: firstPath, contentType: first.mimeType, size: first.size }),
    inspectImage: async () => true,
    del: async () => {},
  });
  await firstService.completeUpload({
    tokenPayload: firstToken,
    blob: { pathname: firstPath, contentType: first.mimeType, url: "https://blob.example.test/first.jpg" },
  });

  const replacement = metadata({ operation: "replace", revision: 1, size: 2345, originalFilename: "second.jpg" });
  const secondPath = `md-media/${replacement.id}/second.jpg`;
  const replacementToken = await tokenFor(database, replacement, secondPath, "replace");
  const removed = [];
  const service = createBlobService(database, config, {
    head: async () => ({ pathname: secondPath, contentType: replacement.mimeType, size: replacement.size }),
    inspectImage: async () => true,
    del: async (url) => removed.push(url),
  });
  await service.completeUpload({
    tokenPayload: replacementToken,
    blob: { pathname: secondPath, contentType: replacement.mimeType, url: "https://blob.example.test/second.jpg" },
  });
  const item = await createMediaRepository(database).get(replacement.id);
  assert.equal(item.url, "https://blob.example.test/second.jpg");
  assert.equal(item.revision, 2);
  assert.deepEqual(removed, ["https://blob.example.test/first.jpg"]);
});

test("exclusao e bloqueada enquanto uma entidade referencia a midia", async (context) => {
  const database = await fixture(context);
  await database.query(
    `INSERT INTO media_assets
      (id, provider, storage_key, url, label, alt_text, mime_type, read_only)
     VALUES ($1, 'vercel_blob', $2, $3, $4, $5, 'image/jpeg', false)`,
    ["media-event-test", "md-media/media-event-test/file.jpg", "https://blob.example.test/file.jpg", "Evento", "Imagem do evento"]
  );
  const source = structuredClone(events[0]);
  source.visual.mediaId = "media-event-test";
  await createEventRepository(database).create(source, null, { id: source.id, slug: source.slug });
  const repository = createMediaRepository(database);
  await assert.rejects(repository.remove("media-event-test", 1, null, async () => {}), (error) => error.code === "MEDIA_IN_USE");
  const usage = await repository.usage("media-event-test");
  assert.equal(usage.length, 1);
  assert.equal(usage[0].entityId, source.id);
});
