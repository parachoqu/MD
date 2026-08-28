// Repositorio de eventos do painel admin. Estado interno = array persistido em
// md.admin.events.v1, semeado a partir de data/events.js (nunca mutado). Cada
// evento ganha, so no admin, um `editorialStatus` ("draft"|"published"|"archived")
// que nao existe no modelo publico -- create() sempre nasce "draft"; update()
// nunca altera editorialStatus; so publish()/archive() mudam esse campo.

import { localStore, withLatency } from "../storage-adapter.js";
import { STORAGE_KEYS } from "../data/admin-seed.js";
import { clone, generateId, isValidSlug, isSafeUrl, isNonNegativeNumber, slugify } from "../utils.js";
import { ok, fail, failValidation } from "../result.js";
import { record } from "./activity-repository.js";

export const OPERATIONAL_STATUSES = ["open", "soon", "closed", "finished", "cancelled", "full"];
export const EDITORIAL_STATUSES = ["draft", "published", "archived"];

function readAll() {
  return localStore.read(STORAGE_KEYS.events, []);
}

function writeAll(list) {
  localStore.write(STORAGE_KEYS.events, list);
}

function findIndex(list, id) {
  return list.findIndex((event) => event.id === id);
}

function isSlugTaken(list, slug, excludeId) {
  return list.some((event) => event.slug === slug && event.id !== excludeId);
}

function toNumberOrUndefined(value) {
  if (value === undefined || value === null || value === "") return undefined;
  return Number(value);
}

export function validateEvent(data, list, excludeId) {
  const errors = [];

  if (!data.title || !String(data.title).trim()) {
    errors.push({ field: "title", message: "Informe o título do evento." });
  }

  if (!data.slug || !isValidSlug(data.slug)) {
    errors.push({ field: "slug", message: "Slug inválido. Use letras minúsculas, números e hífens." });
  } else if (isSlugTaken(list, data.slug, excludeId)) {
    errors.push({ field: "slug", message: "Já existe um evento com este slug." });
  }

  if (data.status && !OPERATIONAL_STATUSES.includes(data.status)) {
    errors.push({ field: "status", message: "Estado operacional desconhecido." });
  }

  const date = data.date || {};
  if (date.start && date.end && date.end < date.start) {
    errors.push({ field: "date.end", message: "A data final deve ser igual ou posterior à inicial." });
  }

  const registrationPeriod = data.registrationPeriod || {};
  if (registrationPeriod.start && registrationPeriod.end && registrationPeriod.end < registrationPeriod.start) {
    errors.push({ field: "registrationPeriod.end", message: "O fim das inscrições deve ser igual ou posterior ao início." });
  }

  const categories = data.categories || [];
  const categoryIds = categories.map((category) => category.id).filter(Boolean);
  if (new Set(categoryIds).size !== categoryIds.length) {
    errors.push({ field: "categories", message: "Existem categorias com o mesmo ID." });
  }

  const registrationConfig = data.registrationConfig || {};
  ["minParticipants", "maxParticipants"].forEach((key) => {
    const value = toNumberOrUndefined(registrationConfig[key]);
    if (value !== undefined && !isNonNegativeNumber(value)) {
      errors.push({ field: `registrationConfig.${key}`, message: "Informe um número não negativo." });
    }
  });
  const minP = toNumberOrUndefined(registrationConfig.minParticipants);
  const maxP = toNumberOrUndefined(registrationConfig.maxParticipants);
  if (minP !== undefined && maxP !== undefined && maxP < minP) {
    errors.push({ field: "registrationConfig.maxParticipants", message: "O máximo não pode ser menor que o mínimo." });
  }

  if (data.registrationDetails) {
    ["maxMembers", "maxAthletes", "maxStaff", "matchRosterLimit"].forEach((key) => {
      const value = toNumberOrUndefined(data.registrationDetails[key]);
      if (value !== undefined && !isNonNegativeNumber(value)) {
        errors.push({ field: `registrationDetails.${key}`, message: "Informe um número não negativo." });
      }
    });
  }

  if (data.capacity) {
    const teams = toNumberOrUndefined(data.capacity.teams);
    if (teams !== undefined && !isNonNegativeNumber(teams)) {
      errors.push({ field: "capacity.teams", message: "Informe um número não negativo." });
    }
  }

  if (data.visual && (data.visual.mediaId || data.visual.image) && !data.visual.imageAlt) {
    errors.push({ field: "visual.imageAlt", message: "Informe o texto alternativo da imagem." });
  }

  (data.sponsors || []).forEach((sponsor, index) => {
    if (sponsor.url && !isSafeUrl(sponsor.url)) {
      errors.push({ field: `sponsors.${index}.url`, message: "URL inválida ou insegura." });
    }
    if (sponsor.logo && !sponsor.alt) {
      errors.push({ field: `sponsors.${index}.alt`, message: "Informe o texto alternativo do patrocinador." });
    }
  });

  return errors;
}

export const eventRepository = {
  async list(filters) {
    return withLatency(() => {
      const f = filters || {};
      let items = readAll().map(clone);
      if (f.query) {
        const q = String(f.query).toLowerCase();
        items = items.filter((event) =>
          [event.title, event.shortTitle, event.sport, event.summary]
            .concat(event.keywords || [])
            .filter(Boolean)
            .some((text) => String(text).toLowerCase().includes(q))
        );
      }
      if (f.status) items = items.filter((event) => event.status === f.status);
      if (f.editorialStatus) items = items.filter((event) => event.editorialStatus === f.editorialStatus);
      if (f.sportKey) items = items.filter((event) => event.sportKey === f.sportKey);
      items.sort((a, b) => String((a.date && a.date.sort) || "").localeCompare(String((b.date && b.date.sort) || "")));
      if (f.sort === "title-asc") items.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
      if (f.sort === "recent") items.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
      return ok(items);
    });
  },

  async getById(id) {
    return withLatency(() => {
      const found = readAll().find((event) => event.id === id);
      return found ? ok(clone(found)) : fail("not_found", "Evento não encontrado.");
    });
  },

  async create(data) {
    return withLatency(() => {
      const list = readAll();
      const payload = clone(data);
      payload.slug = payload.slug ? slugify(payload.slug) : slugify(payload.title || "");
      const errors = validateEvent(payload, list, null);
      if (errors.length) return failValidation(errors);
      const now = new Date().toISOString();
      const event = Object.assign({}, payload, {
        id: generateId("evt"),
        editorialStatus: "draft",
        createdAt: now,
        updatedAt: now,
      });
      list.push(event);
      writeAll(list);
      record({ domain: "events", action: "create", label: "Evento criado: " + event.title });
      return ok(clone(event));
    });
  },

  async update(id, data) {
    return withLatency(() => {
      const list = readAll();
      const index = findIndex(list, id);
      if (index === -1) return fail("not_found", "Evento não encontrado.");
      const payload = clone(data);
      payload.slug = payload.slug ? slugify(payload.slug) : list[index].slug;
      const errors = validateEvent(payload, list, id);
      if (errors.length) return failValidation(errors);
      const updated = Object.assign({}, list[index], payload, {
        id: list[index].id,
        editorialStatus: list[index].editorialStatus,
        createdAt: list[index].createdAt,
        updatedAt: new Date().toISOString(),
      });
      list[index] = updated;
      writeAll(list);
      record({ domain: "events", action: "update", label: "Rascunho salvo: " + updated.title });
      return ok(clone(updated));
    });
  },

  async duplicate(id) {
    return withLatency(() => {
      const list = readAll();
      const source = list.find((event) => event.id === id);
      if (!source) return fail("not_found", "Evento não encontrado.");
      let candidateSlug = source.slug + "-copia";
      let attempt = 2;
      while (isSlugTaken(list, candidateSlug, null)) {
        candidateSlug = source.slug + "-copia-" + attempt;
        attempt += 1;
      }
      const now = new Date().toISOString();
      const duplicated = clone(source);
      duplicated.id = generateId("evt");
      duplicated.slug = candidateSlug;
      duplicated.title = source.title + " (cópia)";
      duplicated.editorialStatus = "draft";
      duplicated.createdAt = now;
      duplicated.updatedAt = now;
      list.push(duplicated);
      writeAll(list);
      record({ domain: "events", action: "duplicate", label: "Evento duplicado: " + duplicated.title });
      return ok(clone(duplicated));
    });
  },

  async archive(id) {
    return withLatency(() => {
      const list = readAll();
      const index = findIndex(list, id);
      if (index === -1) return fail("not_found", "Evento não encontrado.");
      list[index] = Object.assign({}, list[index], {
        editorialStatus: "archived",
        updatedAt: new Date().toISOString(),
      });
      writeAll(list);
      record({ domain: "events", action: "archive", label: "Evento arquivado: " + list[index].title });
      return ok(clone(list[index]));
    });
  },

  async publish(id) {
    return withLatency(() => {
      const list = readAll();
      const index = findIndex(list, id);
      if (index === -1) return fail("not_found", "Evento não encontrado.");
      list[index] = Object.assign({}, list[index], {
        editorialStatus: "published",
        updatedAt: new Date().toISOString(),
      });
      writeAll(list);
      record({ domain: "events", action: "publish", label: "Publicado no modo local: " + list[index].title });
      return ok(clone(list[index]));
    });
  },

  async delete(id) {
    return withLatency(() => {
      const list = readAll();
      const index = findIndex(list, id);
      if (index === -1) return fail("not_found", "Evento não encontrado.");
      const removed = list.splice(index, 1)[0];
      writeAll(list);
      record({ domain: "events", action: "delete", label: "Evento excluído: " + removed.title });
      return ok(true);
    });
  },
};
