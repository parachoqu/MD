// Repositorio de midia. Metadados (formato, dimensoes, alt, "locais de uso") em
// md.admin.media.v1 (localStorage); blobs binarios exclusivamente no IndexedDB
// (idb, ver storage-adapter.js) -- nunca base64 em localStorage. Ativos estaticos
// existentes (assets/img/...) entram como `kind:"static"`, somente leitura.
//
// Upload valida tipo declarado + tamanho e, mais importante, tenta decodificar o
// arquivo como imagem de verdade (new Image().decode()) antes de aceitar --
// um .txt renomeado para .png falha aqui mesmo passando no filtro de mimetype.

import { localStore, idb, withLatency } from "../storage-adapter.js";
import { STORAGE_KEYS } from "../data/admin-seed.js";
import { clone, generateId, sanitizeLabel } from "../utils.js";
import { ok, fail, failValidation } from "../result.js";
import { record } from "./activity-repository.js";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

function readAll() {
  return localStore.read(STORAGE_KEYS.media, []);
}

function writeAll(list) {
  localStore.write(STORAGE_KEYS.media, list);
}

function findIndex(list, id) {
  return list.findIndex((item) => item.id === id);
}

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function extensionFormat(file) {
  if (file.type === "image/jpeg") return "jpeg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return null;
}

function decodeImageFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    const cleanup = () => URL.revokeObjectURL(objectUrl);
    if (typeof image.decode === "function") {
      image.src = objectUrl;
      image
        .decode()
        .then(() => {
          const dims = { width: image.naturalWidth, height: image.naturalHeight };
          cleanup();
          resolve(dims);
        })
        .catch((error) => {
          cleanup();
          reject(error);
        });
    } else {
      image.onload = () => {
        const dims = { width: image.naturalWidth, height: image.naturalHeight };
        cleanup();
        resolve(dims);
      };
      image.onerror = (error) => {
        cleanup();
        reject(error);
      };
      image.src = objectUrl;
    }
  });
}

// Varre os dominios que podem referenciar um mediaId, sob demanda -- nunca
// mantido como indice denormalizado (evita bugs de sincronizacao a cada
// mutacao de evento/projeto/conteudo/settings).
export function computeUsage(mediaId) {
  const usage = [];

  (localStore.read(STORAGE_KEYS.events, []) || []).forEach((event) => {
    if (event.visual && event.visual.mediaId === mediaId) {
      usage.push({ domain: "events", label: event.title });
    }
  });

  (localStore.read(STORAGE_KEYS.projects, []) || []).forEach((project) => {
    if (project.mediaId === mediaId) {
      usage.push({ domain: "projects", label: project.title });
    }
  });

  const content = localStore.read(STORAGE_KEYS.content, {});
  Object.keys(content).forEach((pageId) => {
    const sections = (content[pageId] && content[pageId].sections) || {};
    Object.keys(sections).forEach((sectionId) => {
      const section = sections[sectionId] || {};
      if (section.image === mediaId) {
        usage.push({ domain: "content", label: pageId + " / " + sectionId });
      }
      Object.keys(section).forEach((key) => {
        const value = section[key];
        if (Array.isArray(value)) {
          value.forEach((item) => {
            if (item && item.image === mediaId) {
              usage.push({ domain: "content", label: pageId + " / " + sectionId });
            }
          });
        }
      });
    });
  });

  const settings = localStore.read(STORAGE_KEYS.settings, {});
  if (settings.logoMediaId === mediaId) usage.push({ domain: "settings", label: "Logo" });
  if (settings.faviconMediaId === mediaId) usage.push({ domain: "settings", label: "Favicon" });

  return usage;
}

const previewUrlCache = new Map();

export const mediaRepository = {
  async list(filters) {
    return withLatency(() => {
      const f = filters || {};
      let items = readAll().map(clone);
      if (f.query) {
        const q = String(f.query).toLowerCase();
        items = items.filter((item) =>
          [item.label, item.alt].filter(Boolean).some((text) => text.toLowerCase().includes(q))
        );
      }
      if (f.format) items = items.filter((item) => item.format === f.format);
      if (f.kind) items = items.filter((item) => item.kind === f.kind);
      return ok(items);
    });
  },

  async get(id) {
    return withLatency(() => {
      const found = readAll().find((item) => item.id === id);
      return found ? ok(clone(found)) : fail("not_found", "Mídia não encontrada.");
    });
  },

  async upload(file, metadata) {
    const meta = metadata || {};
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return failValidation([{ field: "file", message: "Formato não aceito. Envie JPEG, PNG ou WebP (SVG é recusado nesta fase)." }]);
    }
    if (file.size > MAX_SIZE_BYTES) {
      return failValidation([{ field: "file", message: "Arquivo maior que 5 MB." }]);
    }
    if (isBlank(meta.alt)) {
      return failValidation([{ field: "alt", message: "Informe o texto alternativo antes de salvar." }]);
    }
    let dimensions;
    try {
      dimensions = await decodeImageFile(file);
    } catch {
      return failValidation([{ field: "file", message: "O arquivo não pôde ser decodificado como imagem válida." }]);
    }
    return withLatency(async () => {
      const id = generateId("media");
      await idb.put({ id, blob: file, createdAt: new Date().toISOString() });
      const mediaRecord = {
        id,
        kind: "upload",
        format: extensionFormat(file),
        path: null,
        alt: meta.alt,
        label: sanitizeLabel(meta.label || file.name),
        width: dimensions.width,
        height: dimensions.height,
        sizeBytes: file.size,
        originalFilename: sanitizeLabel(file.name, 120),
        createdAt: new Date().toISOString(),
      };
      const list = readAll();
      list.push(mediaRecord);
      writeAll(list);
      record({ domain: "media", action: "upload", label: "Mídia enviada: " + mediaRecord.label });
      return ok(clone(mediaRecord));
    });
  },

  // Troca o blob de um upload existente mantendo o mesmo id -- preserva toda
  // referencia (mediaId) ja usada em eventos/projetos/conteudo/configuracoes.
  async replace(id, file) {
    const list = readAll();
    const index = findIndex(list, id);
    if (index === -1) return fail("not_found", "Mídia não encontrada.");
    if (list[index].kind === "static") {
      return fail("read_only", "Ativos existentes do site são somente leitura nesta fase.");
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return failValidation([{ field: "file", message: "Formato não aceito. Envie JPEG, PNG ou WebP." }]);
    }
    if (file.size > MAX_SIZE_BYTES) {
      return failValidation([{ field: "file", message: "Arquivo maior que 5 MB." }]);
    }
    let dimensions;
    try {
      dimensions = await decodeImageFile(file);
    } catch {
      return failValidation([{ field: "file", message: "O arquivo não pôde ser decodificado como imagem válida." }]);
    }
    return withLatency(async () => {
      await idb.put({ id, blob: file, createdAt: new Date().toISOString() });
      const cachedUrl = previewUrlCache.get(id);
      if (cachedUrl) {
        URL.revokeObjectURL(cachedUrl);
        previewUrlCache.delete(id);
      }
      const updated = Object.assign({}, list[index], {
        format: extensionFormat(file),
        width: dimensions.width,
        height: dimensions.height,
        sizeBytes: file.size,
        originalFilename: sanitizeLabel(file.name, 120),
      });
      list[index] = updated;
      writeAll(list);
      record({ domain: "media", action: "update", label: "Mídia substituída: " + updated.label });
      return ok(clone(updated));
    });
  },

  async update(id, metadata) {
    return withLatency(() => {
      const list = readAll();
      const index = findIndex(list, id);
      if (index === -1) return fail("not_found", "Mídia não encontrada.");
      if (list[index].kind === "static") {
        return fail("read_only", "Ativos existentes do site são somente leitura nesta fase.");
      }
      if (isBlank(metadata.alt)) {
        return failValidation([{ field: "alt", message: "O texto alternativo é obrigatório." }]);
      }
      list[index] = Object.assign({}, list[index], {
        alt: metadata.alt,
        label: metadata.label ? sanitizeLabel(metadata.label) : list[index].label,
      });
      writeAll(list);
      record({ domain: "media", action: "update", label: "Mídia atualizada: " + list[index].label });
      return ok(clone(list[index]));
    });
  },

  async delete(id) {
    return withLatency(async () => {
      const list = readAll();
      const index = findIndex(list, id);
      if (index === -1) return fail("not_found", "Mídia não encontrada.");
      const item = list[index];
      if (item.kind === "static") {
        return fail("read_only", "Ativos existentes do site não podem ser excluídos nesta fase.");
      }
      const usage = computeUsage(id);
      if (usage.length) {
        return { ok: false, error: { code: "in_use", message: "Esta mídia está em uso e não pode ser excluída.", field: null, usage } };
      }
      list.splice(index, 1);
      writeAll(list);
      const cachedUrl = previewUrlCache.get(id);
      if (cachedUrl) {
        URL.revokeObjectURL(cachedUrl);
        previewUrlCache.delete(id);
      }
      try {
        await idb.delete(id);
      } catch {
        // segue sem bloquear a exclusao dos metadados caso o IndexedDB falhe
      }
      record({ domain: "media", action: "delete", label: "Mídia excluída: " + item.label });
      return ok(true);
    });
  },

  async getUsage(id) {
    return withLatency(() => ok(computeUsage(id)));
  },

  // Nao usa withLatency: chamado repetidamente por views para renderizar preview,
  // precisa ser imediato. O cache evita recriar URLs para a mesma midia.
  async getPreviewUrl(id) {
    if (previewUrlCache.has(id)) return previewUrlCache.get(id);
    const found = readAll().find((item) => item.id === id);
    if (!found) return null;
    if (found.kind === "static") return found.path;
    const stored = await idb.get(id);
    if (!stored || !stored.blob) return null;
    const url = URL.createObjectURL(stored.blob);
    previewUrlCache.set(id, url);
    return url;
  },

  releasePreviewUrl(id) {
    const url = previewUrlCache.get(id);
    if (!url) return;
    URL.revokeObjectURL(url);
    previewUrlCache.delete(id);
  },

  releaseAllPreviewUrls() {
    previewUrlCache.forEach((url) => URL.revokeObjectURL(url));
    previewUrlCache.clear();
  },
};
