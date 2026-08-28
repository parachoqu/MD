import { apiRequest, queryString } from "../api-client.js";
import { failValidation } from "../result.js";

export const PROJECT_CATEGORIES = ["empresas", "escolas", "comunidades"];

const revisions = new Map();

function remember(value) {
  const items = Array.isArray(value) ? value : [value];
  items.filter(Boolean).forEach((item) => revisions.set(item.id, item.revision));
  return value;
}

export function validateProject(data) {
  const errors = [];
  if (!data.title || !String(data.title).trim()) errors.push({ field: "title", message: "Informe o título do projeto." });
  if (!data.category || !PROJECT_CATEGORIES.includes(data.category)) errors.push({ field: "category", message: "Selecione uma categoria válida." });
  if ((data.mediaId || data.image) && !data.imageAlt) errors.push({ field: "imageAlt", message: "Informe o texto alternativo da imagem." });
  return errors;
}

async function revisionFor(id) {
  if (revisions.has(id)) return { ok: true, data: revisions.get(id) };
  const result = await projectRepository.getById(id);
  return result.ok ? { ok: true, data: result.data.revision } : result;
}

async function editorialAction(id, action) {
  const revision = await revisionFor(id);
  if (!revision.ok) return revision;
  const result = await apiRequest(`/api/admin/projects/${encodeURIComponent(id)}/${action}`, {
    method: "POST",
    body: { revision: revision.data },
  });
  if (result.ok) remember(result.data);
  return result;
}

export const projectRepository = {
  async list(filters = {}) {
    const result = await apiRequest(`/api/admin/projects${queryString(filters)}`);
    if (result.ok) remember(result.data);
    return result;
  },

  async getById(id) {
    const result = await apiRequest(`/api/admin/projects/${encodeURIComponent(id)}`);
    if (result.ok) remember(result.data);
    return result;
  },

  async create(data) {
    const errors = validateProject(data);
    if (errors.length) return failValidation(errors);
    const result = await apiRequest("/api/admin/projects", { method: "POST", body: { data } });
    if (result.ok) remember(result.data);
    return result;
  },

  async update(id, data) {
    const errors = validateProject(data);
    if (errors.length) return failValidation(errors);
    const result = await apiRequest(`/api/admin/projects/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: { data, revision: Number(data.revision || revisions.get(id)) },
    });
    if (result.ok) remember(result.data);
    return result;
  },

  async duplicate(id) {
    const result = await apiRequest(`/api/admin/projects/${encodeURIComponent(id)}/duplicate`, { method: "POST", body: {} });
    if (result.ok) remember(result.data);
    return result;
  },

  archive(id) {
    return editorialAction(id, "archive");
  },

  publish(id) {
    return editorialAction(id, "publish");
  },

  async delete(id) {
    const revision = await revisionFor(id);
    if (!revision.ok) return revision;
    const result = await apiRequest(`/api/admin/projects/${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: { revision: revision.data },
    });
    if (result.ok) revisions.delete(id);
    return result;
  },

  async reorder(id, direction) {
    const revision = await revisionFor(id);
    if (!revision.ok) return revision;
    const result = await apiRequest("/api/admin/projects/reorder", {
      method: "POST",
      body: { id, direction, revision: revision.data },
    });
    if (result.ok) remember(result.data);
    return result;
  },
};
