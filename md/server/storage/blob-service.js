import { del, head } from "@vercel/blob";
import { handleUpload } from "@vercel/blob/client";
import { AppError, conflictError, notFoundError } from "../http/errors.js";
import { recordAudit } from "../repositories/audit-repository.js";
import { hmac, safeEqual, stableJson } from "../security/crypto.js";
import { mediaMetadataSchema } from "../validation/submissions.js";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function assertPathname(pathname, metadata) {
  const extension = EXTENSIONS[metadata.mimeType];
  const prefix = `md-media/${metadata.id}/`;
  if (
    !pathname.startsWith(prefix) ||
    pathname.includes("..") ||
    !new RegExp(`^[a-zA-Z0-9/_-]+\\.${extension}$`).test(pathname)
  ) {
    throw new AppError("INVALID_BLOB_PATH", "Caminho de upload invalido.", 422);
  }
}

function signedTokenPayload(data, secret) {
  return JSON.stringify({ ...data, signature: hmac(stableJson(data), secret) });
}

function parseTokenPayload(value, secret) {
  let parsed;
  try {
    parsed = JSON.parse(value || "{}");
  } catch {
    throw new AppError("INVALID_UPLOAD_CALLBACK", "Callback de upload invalido.", 403);
  }
  const { signature, ...data } = parsed;
  if (!signature || !safeEqual(signature, hmac(stableJson(data), secret))) {
    throw new AppError("INVALID_UPLOAD_CALLBACK", "Callback de upload invalido.", 403);
  }
  if (!data.issuedAt || Date.now() - Number(data.issuedAt) > 20 * 60 * 1000) {
    throw new AppError("UPLOAD_CALLBACK_EXPIRED", "Autorizacao de upload expirada.", 403);
  }
  return data;
}

export function matchesImageSignature(bytes, mimeType) {
  if (mimeType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  }
  if (mimeType === "image/webp") {
    return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

async function inspectRemoteImage(url, mimeType) {
  const response = await fetch(url, { headers: { Range: "bytes=0-31" }, cache: "no-store" });
  if (!response.ok) throw new Error("blob-inspection-failed");
  const bytes = new Uint8Array(await response.arrayBuffer());
  return matchesImageSignature(bytes, mimeType);
}

export function createBlobService(database, config, dependencies = {}) {
  const sdkHandleUpload = dependencies.handleUpload || handleUpload;
  const removeBlob = dependencies.del || ((url) => del(url, { token: config.blobToken }));
  const readBlobMetadata = dependencies.head || ((url) => head(url, { token: config.blobToken }));
  const inspectImage = dependencies.inspectImage || inspectRemoteImage;

  async function authorizeMetadata(metadata, actorUserId) {
    const existing = await database.query(
      "SELECT id, provider, read_only, revision FROM media_assets WHERE id = $1 AND deleted_at IS NULL LIMIT 1",
      [metadata.id]
    );
    const row = existing.rows[0];
    if (metadata.operation === "upload" && row) {
      throw new AppError("MEDIA_ID_CONFLICT", "O identificador da midia ja existe.", 409);
    }
    if (metadata.operation === "replace") {
      if (!row) throw notFoundError("Midia nao encontrada.");
      if (row.read_only || row.provider === "static") throw new AppError("READ_ONLY", "Ativos estaticos sao somente leitura.", 409);
      if (Number(row.revision) !== Number(metadata.revision)) throw conflictError();
    }
    return signedTokenPayload({ metadata, actorUserId, issuedAt: Date.now() }, config.sessionSecret);
  }

  async function completeUpload(payload) {
    const tokenData = parseTokenPayload(payload.tokenPayload, config.sessionSecret);
    const metadata = mediaMetadataSchema.parse(tokenData.metadata);
    const blob = payload.blob;
    assertPathname(blob.pathname, metadata);
    const stored = await readBlobMetadata(blob.url);
    if (
      blob.contentType !== metadata.mimeType ||
      stored.pathname !== blob.pathname ||
      stored.contentType !== metadata.mimeType ||
      Number(stored.size) !== Number(metadata.size) ||
      Number(stored.size) > MAX_SIZE
    ) {
      await removeBlob(blob.url).catch(() => {});
      throw new AppError("UPLOAD_METADATA_MISMATCH", "O arquivo recebido diverge da autorizacao.", 422);
    }
    if (!(await inspectImage(blob.url, metadata.mimeType))) {
      await removeBlob(blob.url).catch(() => {});
      throw new AppError("INVALID_IMAGE", "O arquivo nao corresponde a uma imagem valida.", 422);
    }

    let previousUrl = null;
    await database.transaction(async (tx) => {
      if (metadata.operation === "upload") {
        const existing = await tx.query("SELECT url FROM media_assets WHERE id = $1 LIMIT 1", [metadata.id]);
        if (existing.rows[0]) {
          if (existing.rows[0].url === blob.url) return;
          throw new AppError("MEDIA_ID_CONFLICT", "O identificador da midia ja existe.", 409);
        }
        await tx.query(
          `INSERT INTO media_assets
            (id, provider, storage_key, url, label, alt_text, mime_type, size_bytes,
             width, height, original_filename, read_only, created_by, updated_by)
           VALUES ($1, 'vercel_blob', $2, $3, $4, $5, $6, $7, $8, $9, $10, false, $11, $11)`,
          [
            metadata.id,
            blob.pathname,
            blob.url,
            metadata.label,
            metadata.alt,
            metadata.mimeType,
            stored.size,
            metadata.width || null,
            metadata.height || null,
            metadata.originalFilename,
            tokenData.actorUserId || null,
          ]
        );
      } else {
        const current = await tx.query("SELECT url, revision FROM media_assets WHERE id = $1 AND deleted_at IS NULL FOR UPDATE", [metadata.id]);
        if (!current.rows[0]) throw notFoundError("Midia nao encontrada.");
        if (current.rows[0].url === blob.url) return;
        if (Number(current.rows[0].revision) !== Number(metadata.revision)) throw conflictError();
        previousUrl = current.rows[0].url;
        await tx.query(
          `UPDATE media_assets
           SET storage_key = $2, url = $3, mime_type = $4, size_bytes = $5,
               width = $6, height = $7, original_filename = $8,
               revision = revision + 1, updated_by = $9, updated_at = now()
           WHERE id = $1`,
          [
            metadata.id,
            blob.pathname,
            blob.url,
            metadata.mimeType,
            stored.size,
            metadata.width || null,
            metadata.height || null,
            metadata.originalFilename,
            tokenData.actorUserId || null,
          ]
        );
      }
      await recordAudit(tx, {
        actorUserId: tokenData.actorUserId,
        action: metadata.operation === "replace" ? "media.replace" : "media.upload",
        entityType: "media_asset",
        entityId: metadata.id,
        previousRevision: metadata.operation === "replace" ? metadata.revision : null,
        newRevision: metadata.operation === "replace" ? Number(metadata.revision) + 1 : 1,
        metadata: { mimeType: metadata.mimeType, size: metadata.size },
      });
    });
    if (previousUrl) await removeBlob(previousUrl).catch(() => {});
  }

  async function handle(request, body, session, options = {}) {
    if (!config.blobToken) throw new AppError("BLOB_NOT_CONFIGURED", "Armazenamento de midia nao configurado.", 503);
    return sdkHandleUpload({
      token: config.blobToken,
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload, multipart) => {
        if (!session) throw new AppError("UNAUTHORIZED", "Sessao ausente ou expirada.", 401);
        if (multipart) throw new AppError("MULTIPART_NOT_ALLOWED", "Upload multipart nao e necessario para este limite.", 422);
        let rawMetadata;
        try {
          rawMetadata = JSON.parse(clientPayload || "{}");
        } catch {
          throw new AppError("INVALID_JSON", "Metadados de upload invalidos.", 422);
        }
        const metadata = mediaMetadataSchema.parse(rawMetadata);
        if (options.operation && metadata.operation !== options.operation) {
          throw new AppError("INVALID_UPLOAD_OPERATION", "Operacao de upload invalida.", 422);
        }
        if (options.mediaId && metadata.id !== options.mediaId) {
          throw new AppError("INVALID_UPLOAD_TARGET", "Destino de upload invalido.", 422);
        }
        assertPathname(pathname, metadata);
        const tokenPayload = await authorizeMetadata(metadata, session.user_id);
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_SIZE,
          validUntil: Date.now() + 10 * 60 * 1000,
          addRandomSuffix: false,
          allowOverwrite: false,
          cacheControlMaxAge: 31_536_000,
          tokenPayload,
          callbackUrl: `${config.appOrigin}/api/admin/media/upload-token`,
        };
      },
      onUploadCompleted: completeUpload,
    });
  }

  return { handle, removeBlob, completeUpload };
}
