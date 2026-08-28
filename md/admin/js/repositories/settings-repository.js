// Repositorio de configuracoes globais do site (singleton). Estado interno =
// objeto persistido em md.admin.settings.v1, semeado a partir dos valores reais
// hoje publicados em index.html/inscricoes.html (ver admin-seed.js).

import { localStore, withLatency } from "../storage-adapter.js";
import { STORAGE_KEYS } from "../data/admin-seed.js";
import { clone, isSafeUrl } from "../utils.js";
import { ok, failValidation } from "../result.js";
import { record } from "./activity-repository.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readSettings() {
  return localStore.read(STORAGE_KEYS.settings, {});
}

function writeSettings(data) {
  localStore.write(STORAGE_KEYS.settings, data);
}

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

export function validateSettings(data) {
  const errors = [];
  if (isBlank(data.organizationName)) {
    errors.push({ field: "organizationName", message: "Informe o nome da organização." });
  }
  if (!isBlank(data.email) && !EMAIL_PATTERN.test(data.email)) {
    errors.push({ field: "email", message: "Informe um e-mail válido." });
  }
  if (!isBlank(data.whatsapp) && !isSafeUrl(data.whatsapp)) {
    errors.push({ field: "whatsapp", message: "Link de WhatsApp inválido ou inseguro." });
  }
  if (!isBlank(data.instagram) && !isSafeUrl(data.instagram)) {
    errors.push({ field: "instagram", message: "Link de Instagram inválido ou inseguro." });
  }
  if (isBlank(data.seoTitle)) {
    errors.push({ field: "seoTitle", message: "Informe o título SEO padrão." });
  }
  if (isBlank(data.seoDescription)) {
    errors.push({ field: "seoDescription", message: "Informe a descrição SEO padrão." });
  }
  return errors;
}

export const settingsRepository = {
  async get() {
    return withLatency(() => ok(clone(readSettings())));
  },

  async update(data) {
    return withLatency(() => {
      const errors = validateSettings(data);
      if (errors.length) return failValidation(errors);
      const current = readSettings();
      const updated = Object.assign({}, current, clone(data), { updatedAt: new Date().toISOString() });
      writeSettings(updated);
      record({ domain: "settings", action: "update", label: "Configurações globais atualizadas" });
      return ok(clone(updated));
    });
  },
};
