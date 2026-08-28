import { upload as uploadToBlob } from "../vendor/vercel-blob-client.js";
import { apiRequest, getCsrfToken, queryString } from "../api-client.js";
import { fail, failValidation } from "../result.js";
import { generateId, sanitizeLabel } from "../utils.js";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const items = new Map();

function remember(value) {
  const values = Array.isArray(value) ? value : [value];
  values.filter(Boolean).forEach((item) => items.set(item.id, item));
  return value;
}

function decodeImageFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    const cleanup = () => URL.revokeObjectURL(objectUrl);
    image.src = objectUrl;
    const success = () => {
      const dimensions = { width: image.naturalWidth, height: image.naturalHeight };
      cleanup();
      resolve(dimensions);
    };
    const failure = (error) => {
      cleanup();
      reject(error);
    };
    if (typeof image.decode === "function") image.decode().then(success).catch(failure);
    else {
      image.onload = success;
      image.onerror = failure;
    }
  });
}

async function validatedUpload(file, metadata) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return failValidation([{ field: "file", message: "Formato não aceito. Envie JPEG, PNG ou WebP (SVG é recusado)." }]);
  }
  if (file.size > MAX_SIZE_BYTES) return failValidation([{ field: "file", message: "Arquivo maior que 5 MB." }]);
  if (!String(metadata.alt || "").trim()) return failValidation([{ field: "alt", message: "Informe o texto alternativo antes de salvar." }]);
  try {
    return { ok: true, data: await decodeImageFile(file) };
  } catch {
    return failValidation([{ field: "file", message: "O arquivo não pôde ser decodificado como imagem válida." }]);
  }
}

async function waitForMetadata(id, expectedUrl, attempts = 20) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const result = await apiRequest(`/api/admin/media/${encodeURIComponent(id)}`);
    if (result.ok && (!expectedUrl || result.data.path === expectedUrl)) {
      remember(result.data);
      return result;
    }
    if (!result.ok && result.error?.code !== "not_found") return result;
    await new Promise((resolve) => window.setTimeout(resolve, 350));
  }
  return fail("upload_pending", "O arquivo foi enviado, mas a confirmação ainda está em processamento. Atualize a biblioteca em instantes.");
}

async function performBlobUpload(file, metadata, handleUploadUrl) {
  const extension = EXTENSIONS[file.type];
  const filename = `asset-${window.crypto?.randomUUID?.() || generateId("file")}.${extension}`;
  const pathname = `md-media/${metadata.id}/${filename}`;
  try {
    const blob = await uploadToBlob(pathname, file, {
      access: "public",
      contentType: file.type,
      multipart: false,
      handleUploadUrl,
      clientPayload: JSON.stringify(metadata),
      headers: { "X-CSRF-Token": getCsrfToken() },
    });
    return waitForMetadata(metadata.id, blob.url);
  } catch (error) {
    return fail("upload_failed", error?.message || "Não foi possível enviar a imagem.");
  }
}

async function itemFor(id) {
  if (items.has(id)) return { ok: true, data: items.get(id) };
  return mediaRepository.get(id);
}

export async function computeUsage(mediaId) {
  const result = await apiRequest(`/api/admin/media/${encodeURIComponent(mediaId)}/usage`);
  return result.ok ? result.data : [];
}

export const mediaRepository = {
  async list(filters = {}) {
    const result = await apiRequest(`/api/admin/media${queryString(filters)}`);
    if (result.ok) remember(result.data);
    return result;
  },

  async get(id) {
    const result = await apiRequest(`/api/admin/media/${encodeURIComponent(id)}`);
    if (result.ok) remember(result.data);
    return result;
  },

  async upload(file, rawMetadata = {}) {
    const validation = await validatedUpload(file, rawMetadata);
    if (!validation.ok) return validation;
    const id = generateId("media");
    const metadata = {
      id,
      label: sanitizeLabel(rawMetadata.label || file.name),
      alt: String(rawMetadata.alt || "").trim(),
      originalFilename: sanitizeLabel(file.name, 160),
      mimeType: file.type,
      size: file.size,
      width: validation.data.width,
      height: validation.data.height,
      operation: "upload",
    };
    return performBlobUpload(file, metadata, "/api/admin/media/upload-token");
  },

  async replace(id, file) {
    const current = await itemFor(id);
    if (!current.ok) return current;
    if (current.data.kind === "static") return fail("read_only", "Ativos existentes do site são somente leitura.");
    const validation = await validatedUpload(file, { alt: current.data.alt });
    if (!validation.ok) return validation;
    const metadata = {
      id,
      label: current.data.label,
      alt: current.data.alt,
      originalFilename: sanitizeLabel(file.name, 160),
      mimeType: file.type,
      size: file.size,
      width: validation.data.width,
      height: validation.data.height,
      operation: "replace",
      revision: current.data.revision,
    };
    items.delete(id);
    return performBlobUpload(file, metadata, `/api/admin/media/${encodeURIComponent(id)}/replace`);
  },

  async update(id, metadata) {
    const current = await itemFor(id);
    if (!current.ok) return current;
    const result = await apiRequest(`/api/admin/media/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: {
        label: sanitizeLabel(metadata.label || current.data.label),
        alt: String(metadata.alt || "").trim(),
        revision: current.data.revision,
      },
    });
    if (result.ok) remember(result.data);
    return result;
  },

  async delete(id) {
    const current = await itemFor(id);
    if (!current.ok) return current;
    const result = await apiRequest(`/api/admin/media/${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: { revision: current.data.revision },
    });
    if (result.ok) items.delete(id);
    return result;
  },

  getUsage(id) {
    return apiRequest(`/api/admin/media/${encodeURIComponent(id)}/usage`);
  },

  async getPreviewUrl(id) {
    const current = await itemFor(id);
    return current.ok ? current.data.path : null;
  },

  releasePreviewUrl() {},
  releaseAllPreviewUrls() {},
};
