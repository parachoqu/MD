import { apiRequest } from "../api-client.js";
import { getSectionSchema } from "../data/content-schema.js";
import { fail, failValidation } from "../result.js";
import { isSafeUrl } from "../utils.js";

const pages = new Map();

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function validateSectionData(schema, data) {
  const errors = [];
  (schema.fields || []).forEach((field) => {
    const value = data[field.key];
    if (field.required && isBlank(value)) errors.push({ field: field.key, message: `Preencha "${field.label}".` });
    if (field.type === "url" && !isBlank(value) && !isSafeUrl(value)) errors.push({ field: field.key, message: `URL inválida em "${field.label}".` });
  });
  const hasImageField = (schema.fields || []).some((field) => field.key === "image");
  if (hasImageField && data.image && isBlank(data.imageAlt)) errors.push({ field: "imageAlt", message: "Informe o texto alternativo da imagem." });
  if (schema.repeatable) {
    const items = data[schema.repeatable.key] || [];
    if (schema.protected && items.length < schema.repeatable.minItems) {
      errors.push({ field: schema.repeatable.key, message: `Esta região protegida não pode ficar com menos de ${schema.repeatable.minItems} item(ns).` });
    }
    items.forEach((item, index) => {
      schema.repeatable.itemFields.forEach((field) => {
        const value = item[field.key];
        if (field.required && isBlank(value)) errors.push({ field: `${schema.repeatable.key}.${index}.${field.key}`, message: `Preencha "${field.label}" no item ${index + 1}.` });
        if (field.type === "url" && !isBlank(value) && !isSafeUrl(value)) errors.push({ field: `${schema.repeatable.key}.${index}.${field.key}`, message: "URL inválida." });
      });
      if (item.image && isBlank(item.imageAlt)) errors.push({ field: `${schema.repeatable.key}.${index}.imageAlt`, message: "Informe o texto alternativo da imagem." });
    });
  }
  return errors;
}

async function pageFor(pageId) {
  if (pages.has(pageId)) return { ok: true, data: pages.get(pageId) };
  return contentRepository.getPage(pageId);
}

export const contentRepository = {
  async getPage(pageId) {
    const result = await apiRequest(`/api/admin/content/${encodeURIComponent(pageId)}`);
    if (result.ok) pages.set(pageId, result.data);
    return result;
  },

  async updateSection(pageId, sectionId, data) {
    const schema = getSectionSchema(pageId, sectionId);
    if (!schema) return fail("not_found", "Seção não encontrada.");
    const errors = validateSectionData(schema, data);
    if (errors.length) return failValidation(errors);
    const current = await pageFor(pageId);
    if (!current.ok) return current;
    const page = structuredClone(current.data);
    if (!page.sections) page.sections = {};
    page.sections[sectionId] = structuredClone(data);
    const result = await apiRequest(`/api/admin/content/${encodeURIComponent(pageId)}`, {
      method: "PUT",
      body: { data: page, revision: current.data.revision },
    });
    if (result.ok) pages.set(pageId, result.data);
    return result;
  },

  async restore(pageId) {
    const current = await pageFor(pageId);
    if (!current.ok) return current;
    const result = await apiRequest(`/api/admin/content/${encodeURIComponent(pageId)}/restore`, {
      method: "POST",
      body: { revision: current.data.revision },
    });
    if (result.ok) pages.set(pageId, result.data);
    return result;
  },

  async publish(pageId) {
    const current = await pageFor(pageId);
    if (!current.ok) return current;
    const result = await apiRequest(`/api/admin/content/${encodeURIComponent(pageId)}/publish`, {
      method: "POST",
      body: { revision: current.data.revision },
    });
    if (result.ok) pages.set(pageId, result.data);
    return result;
  },
};
