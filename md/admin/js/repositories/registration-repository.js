// Acesso as inscricoes pela API administrativa. Nenhuma regra de negocio mora
// aqui: paginacao, cursor e filtros sao resolvidos pelo servidor, que tambem
// decide o que o papel do usuario pode ver.

import { apiRequest, queryString } from "../api-client.js";

const BASE = "/api/admin/registrations";

export const REGISTRATION_STATUSES = ["new", "reviewing", "confirmed", "cancelled", "rejected"];

export const REGISTRATION_STATUS_LABELS = {
  new: "Nova",
  reviewing: "Em análise",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  rejected: "Recusada",
};

export const registrationRepository = {
  list(filters = {}) {
    return apiRequest(`${BASE}${queryString(filters)}`);
  },

  // Busca incremental: so o que mudou desde o cursor. Timeout curto porque roda
  // a cada poucos segundos e nao pode acumular requisicoes penduradas.
  sync(cursor, filters = {}) {
    return apiRequest(`${BASE}${queryString({ ...filters, sync: cursor })}`, { timeoutMs: 8000 });
  },

  metrics(filters = {}) {
    return apiRequest(`${BASE}/metrics${queryString(filters)}`);
  },

  getById(id) {
    return apiRequest(`${BASE}/${encodeURIComponent(id)}`);
  },

  updateStatus(id, status, updatedAt) {
    return apiRequest(`${BASE}/${encodeURIComponent(id)}/status`, {
      method: "PUT",
      body: { status, updatedAt },
    });
  },
};
