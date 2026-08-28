import { apiRequest } from "../api-client.js";
import { failValidation } from "../result.js";
import { isSafeUrl } from "../utils.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let current = null;

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

export function validateSettings(data) {
  const errors = [];
  if (isBlank(data.organizationName)) errors.push({ field: "organizationName", message: "Informe o nome da organização." });
  if (!isBlank(data.email) && !EMAIL_PATTERN.test(data.email)) errors.push({ field: "email", message: "Informe um e-mail válido." });
  if (!isBlank(data.whatsapp) && !isSafeUrl(data.whatsapp)) errors.push({ field: "whatsapp", message: "Link de WhatsApp inválido ou inseguro." });
  if (!isBlank(data.instagram) && !isSafeUrl(data.instagram)) errors.push({ field: "instagram", message: "Link de Instagram inválido ou inseguro." });
  if (isBlank(data.seoTitle)) errors.push({ field: "seoTitle", message: "Informe o título SEO padrão." });
  if (isBlank(data.seoDescription)) errors.push({ field: "seoDescription", message: "Informe a descrição SEO padrão." });
  return errors;
}

export const settingsRepository = {
  async get() {
    const result = await apiRequest("/api/admin/settings");
    if (result.ok) current = result.data;
    return result;
  },

  async update(data) {
    const errors = validateSettings(data);
    if (errors.length) return failValidation(errors);
    if (!current) {
      const loaded = await this.get();
      if (!loaded.ok) return loaded;
    }
    const result = await apiRequest("/api/admin/settings", {
      method: "PUT",
      body: { data, revision: Number(data.revision || current.revision) },
    });
    if (result.ok) current = result.data;
    return result;
  },

  async publish() {
    if (!current) {
      const loaded = await this.get();
      if (!loaded.ok) return loaded;
    }
    const result = await apiRequest("/api/admin/settings/publish", {
      method: "POST",
      body: { revision: current.revision },
    });
    if (result.ok) current = result.data;
    return result;
  },
};
