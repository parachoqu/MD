// Repositorio de conteudo institucional. Estado interno = objeto persistido em
// md.admin.content.v1 (uma entrada por pagina: "home", "catalog"). Toda escrita
// e validada contra content-schema.js -- nunca aceita campos fora do schema,
// nunca permite esvaziar por completo uma secao "protected".

import { localStore, withLatency } from "../storage-adapter.js";
import { STORAGE_KEYS, buildContentSeed } from "../data/admin-seed.js";
import { clone, isSafeUrl } from "../utils.js";
import { ok, fail, failValidation } from "../result.js";
import { record } from "./activity-repository.js";
import { getSectionSchema } from "../data/content-schema.js";

function readAll() {
  return localStore.read(STORAGE_KEYS.content, {});
}

function writeAll(data) {
  localStore.write(STORAGE_KEYS.content, data);
}

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function validateSectionData(schema, data) {
  const errors = [];

  (schema.fields || []).forEach((field) => {
    const value = data[field.key];
    if (field.required && isBlank(value)) {
      errors.push({ field: field.key, message: 'Preencha "' + field.label + '".' });
    }
    if (field.type === "url" && !isBlank(value) && !isSafeUrl(value)) {
      errors.push({ field: field.key, message: 'URL inválida em "' + field.label + '".' });
    }
  });

  const hasImageField = (schema.fields || []).some((field) => field.key === "image");
  if (hasImageField && data.image && isBlank(data.imageAlt)) {
    errors.push({ field: "imageAlt", message: "Informe o texto alternativo da imagem." });
  }

  if (schema.repeatable) {
    const items = data[schema.repeatable.key] || [];
    if (schema.protected && items.length < schema.repeatable.minItems) {
      errors.push({
        field: schema.repeatable.key,
        message: "Esta região protegida não pode ficar com menos de " + schema.repeatable.minItems + " item(ns).",
      });
    }
    items.forEach((item, index) => {
      schema.repeatable.itemFields.forEach((field) => {
        const value = item[field.key];
        if (field.required && isBlank(value)) {
          errors.push({
            field: schema.repeatable.key + "." + index + "." + field.key,
            message: 'Preencha "' + field.label + '" no item ' + (index + 1) + ".",
          });
        }
        if (field.type === "url" && !isBlank(value) && !isSafeUrl(value)) {
          errors.push({ field: schema.repeatable.key + "." + index + "." + field.key, message: "URL inválida." });
        }
      });
      if (item.image && isBlank(item.imageAlt)) {
        errors.push({ field: schema.repeatable.key + "." + index + ".imageAlt", message: "Informe o texto alternativo da imagem." });
      }
    });
  }

  return errors;
}

export const contentRepository = {
  async getPage(pageId) {
    return withLatency(() => {
      const all = readAll();
      const page = all[pageId];
      return page ? ok(clone(page)) : fail("not_found", "Página de conteúdo não encontrada.");
    });
  },

  async updateSection(pageId, sectionId, data) {
    return withLatency(() => {
      const schema = getSectionSchema(pageId, sectionId);
      if (!schema) return fail("not_found", "Seção não encontrada.");
      const errors = validateSectionData(schema, data);
      if (errors.length) return failValidation(errors);
      const all = readAll();
      if (!all[pageId]) all[pageId] = { sections: {}, updatedAt: null };
      all[pageId].sections[sectionId] = clone(data);
      all[pageId].updatedAt = new Date().toISOString();
      writeAll(all);
      record({ domain: "content", action: "update", label: "Seção atualizada: " + schema.label });
      return ok(clone(all[pageId]));
    });
  },

  async restore(pageId) {
    return withLatency(() => {
      const seed = buildContentSeed();
      if (!seed[pageId]) return fail("not_found", "Página de conteúdo não encontrada.");
      const all = readAll();
      all[pageId] = clone(seed[pageId]);
      writeAll(all);
      record({ domain: "content", action: "restore", label: "Conteúdo restaurado ao seed: " + pageId });
      return ok(clone(all[pageId]));
    });
  },
};
