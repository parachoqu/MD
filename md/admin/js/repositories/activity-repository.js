import { apiRequest, queryString } from "../api-client.js";

const ACTION_LABELS = {
  "event.create": "Evento criado",
  "event.update": "Rascunho de evento salvo",
  "event.publish": "Evento publicado",
  "event.archive": "Evento arquivado",
  "event.delete": "Evento excluído",
  "project.create": "Projeto criado",
  "project.update": "Projeto atualizado",
  "project.publish": "Projeto publicado",
  "project.archive": "Projeto arquivado",
  "project.delete": "Projeto excluído",
  "project.reorder": "Ordem de projetos alterada",
  "site_page.update": "Conteúdo atualizado",
  "site_page.publish": "Conteúdo publicado",
  "site_settings.update": "Configurações atualizadas",
  "site_settings.publish": "Configurações publicadas",
  "media.upload": "Mídia enviada",
  "media.replace": "Mídia substituída",
  "media.update": "Mídia atualizada",
  "media.delete": "Mídia excluída",
};

export function record() {
  // A auditoria e registrada exclusivamente pelo servidor.
}

export const activityRepository = {
  async list(limit = 20) {
    const result = await apiRequest(`/api/admin/activity${queryString({ limit })}`);
    if (!result.ok) return result;
    return {
      ok: true,
      data: result.data.map((entry) => ({
        id: entry.id,
        at: entry.created_at,
        domain: entry.entity_type,
        action: entry.action,
        label: `${ACTION_LABELS[entry.action] || entry.action}${entry.entity_id ? `: ${entry.entity_id}` : ""}`,
      })),
    };
  },
};
