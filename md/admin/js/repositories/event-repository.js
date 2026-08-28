import { apiRequest, queryString } from "../api-client.js";
import { isNonNegativeNumber, isSafeUrl, isValidSlug, slugify } from "../utils.js";
import { failValidation } from "../result.js";

export const OPERATIONAL_STATUSES = ["open", "soon", "closed", "finished", "cancelled", "full"];
export const EDITORIAL_STATUSES = ["draft", "published", "archived"];

const revisions = new Map();

function remember(value) {
  const items = Array.isArray(value) ? value : [value];
  items.filter(Boolean).forEach((item) => revisions.set(item.id, item.revision));
  return value;
}

function toNumberOrUndefined(value) {
  if (value === undefined || value === null || value === "") return undefined;
  return Number(value);
}

export function validateEvent(data) {
  const errors = [];
  if (!data.title || !String(data.title).trim()) errors.push({ field: "title", message: "Informe o título do evento." });
  if (!data.slug || !isValidSlug(data.slug)) {
    errors.push({ field: "slug", message: "Slug inválido. Use letras minúsculas, números e hífens." });
  }
  if (data.status && !OPERATIONAL_STATUSES.includes(data.status)) errors.push({ field: "status", message: "Estado operacional desconhecido." });
  if (data.date?.start && data.date?.end && data.date.end < data.date.start) {
    errors.push({ field: "date.end", message: "A data final deve ser igual ou posterior à inicial." });
  }
  if (data.registrationPeriod?.start && data.registrationPeriod?.end && data.registrationPeriod.end < data.registrationPeriod.start) {
    errors.push({ field: "registrationPeriod.end", message: "O fim das inscrições deve ser igual ou posterior ao início." });
  }
  const categoryIds = (data.categories || []).map((category) => category.id).filter(Boolean);
  if (new Set(categoryIds).size !== categoryIds.length) errors.push({ field: "categories", message: "Existem categorias com o mesmo ID." });
  const config = data.registrationConfig || {};
  ["minParticipants", "maxParticipants"].forEach((key) => {
    const value = toNumberOrUndefined(config[key]);
    if (value !== undefined && !isNonNegativeNumber(value)) errors.push({ field: `registrationConfig.${key}`, message: "Informe um número não negativo." });
  });
  const minimum = toNumberOrUndefined(config.minParticipants);
  const maximum = toNumberOrUndefined(config.maxParticipants);
  if (minimum !== undefined && maximum !== undefined && maximum < minimum) {
    errors.push({ field: "registrationConfig.maxParticipants", message: "O máximo não pode ser menor que o mínimo." });
  }
  if (data.registrationDetails) {
    ["maxMembers", "maxAthletes", "maxStaff", "matchRosterLimit"].forEach((key) => {
      const value = toNumberOrUndefined(data.registrationDetails[key]);
      if (value !== undefined && !isNonNegativeNumber(value)) errors.push({ field: `registrationDetails.${key}`, message: "Informe um número não negativo." });
    });
  }
  if (data.capacity) {
    const teams = toNumberOrUndefined(data.capacity.teams);
    if (teams !== undefined && !isNonNegativeNumber(teams)) errors.push({ field: "capacity.teams", message: "Informe um número não negativo." });
  }
  if (data.visual && (data.visual.mediaId || data.visual.image) && !data.visual.imageAlt) {
    errors.push({ field: "visual.imageAlt", message: "Informe o texto alternativo da imagem." });
  }
  (data.sponsors || []).forEach((sponsor, index) => {
    if (sponsor.url && !isSafeUrl(sponsor.url)) errors.push({ field: `sponsors.${index}.url`, message: "URL inválida ou insegura." });
    if (sponsor.logo && !sponsor.alt) errors.push({ field: `sponsors.${index}.alt`, message: "Informe o texto alternativo do patrocinador." });
  });
  return errors;
}

async function revisionFor(id) {
  if (revisions.has(id)) return { ok: true, data: revisions.get(id) };
  const result = await eventRepository.getById(id);
  return result.ok ? { ok: true, data: result.data.revision } : result;
}

async function editorialAction(id, action) {
  const revision = await revisionFor(id);
  if (!revision.ok) return revision;
  const result = await apiRequest(`/api/admin/events/${encodeURIComponent(id)}/${action}`, {
    method: "POST",
    body: { revision: revision.data },
  });
  if (result.ok) remember(result.data);
  return result;
}

export const eventRepository = {
  async list(filters = {}) {
    const result = await apiRequest(`/api/admin/events${queryString(filters)}`);
    if (!result.ok) return result;
    let items = remember(result.data).slice();
    if (filters.sportKey) items = items.filter((item) => item.sportKey === filters.sportKey);
    items.sort((a, b) => String(a.date?.sort || "").localeCompare(String(b.date?.sort || "")));
    if (filters.sort === "title-asc") items.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
    if (filters.sort === "recent") items.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    return { ok: true, data: items };
  },

  async getById(id) {
    const result = await apiRequest(`/api/admin/events/${encodeURIComponent(id)}`);
    if (result.ok) remember(result.data);
    return result;
  },

  async create(data) {
    const payload = structuredClone(data);
    payload.slug = slugify(payload.slug || payload.title || "");
    const errors = validateEvent(payload);
    if (errors.length) return failValidation(errors);
    const result = await apiRequest("/api/admin/events", { method: "POST", body: { data: payload } });
    if (result.ok) remember(result.data);
    return result;
  },

  async update(id, data) {
    const payload = structuredClone(data);
    payload.slug = slugify(payload.slug || "");
    const errors = validateEvent(payload);
    if (errors.length) return failValidation(errors);
    const revision = Number(data.revision || revisions.get(id));
    const result = await apiRequest(`/api/admin/events/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: { data: payload, revision },
    });
    if (result.ok) remember(result.data);
    return result;
  },

  async duplicate(id) {
    const result = await apiRequest(`/api/admin/events/${encodeURIComponent(id)}/duplicate`, { method: "POST", body: {} });
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
    const result = await apiRequest(`/api/admin/events/${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: { revision: revision.data },
    });
    if (result.ok) revisions.delete(id);
    return result;
  },
};
