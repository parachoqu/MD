// Repositorio administrativo para consulta e gestao de inscricoes.
// Conecta com os endpoints /api/admin/registrations do backend.

import { apiRequest, queryString } from "../api-client.js";

export const REGISTRATION_STATUSES = ["new", "reviewing", "confirmed", "cancelled", "rejected"];

export const REGISTRATION_STATUS_LABELS = {
  new: "Nova",
  reviewing: "Em análise",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  rejected: "Recusada",
};

export const registrationRepository = {
  async list(filters = {}) {
    return apiRequest(`/api/admin/registrations${queryString(filters)}`);
  },

  async getById(id) {
    return apiRequest(`/api/admin/registrations/${encodeURIComponent(id)}`);
  },

  async updateStatus(id, status, expectedUpdatedAt) {
    return apiRequest(`/api/admin/registrations/${encodeURIComponent(id)}/status`, {
      method: "PUT",
      body: { status, updatedAt: expectedUpdatedAt || null },
    });
  },
};
