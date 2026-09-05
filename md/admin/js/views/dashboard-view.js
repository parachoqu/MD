// Visao geral: metricas reais calculadas dos dados administrativos. Nada aqui e
// inventado -- nenhuma contagem de inscritos, receita, acessos ou conversao.

import { element, clearChildren } from "../dom.js";
import { eventRepository } from "../repositories/event-repository.js";
import { projectRepository } from "../repositories/project-repository.js";
import { settingsRepository } from "../repositories/settings-repository.js";
import { activityRepository } from "../repositories/activity-repository.js";
import {
  REGISTRATION_STATUS_LABELS,
  registrationRepository,
} from "../repositories/registration-repository.js";
import { formatDateTimeBR } from "../utils.js";
import { createIcon } from "../icons.js";

function metricCard(label, value, meta) {
  return element("div", { className: "admin-metric" }, [
    element("span", { className: "admin-metric__value", text: String(value) }),
    element("span", { className: "admin-metric__label", text: label }),
    meta ? element("span", { className: "admin-metric__meta", text: meta }) : null,
  ]);
}

export const dashboardView = {
  async mount(container, params, shell) {
    shell.setTitle("Visão geral");
    shell.setBreadcrumb([{ label: "Visão geral" }]);

    const [eventsResult, projectsResult, settingsResult, activityResult, registrationsResult] = await Promise.all([
      eventRepository.list({}),
      projectRepository.list({}),
      settingsRepository.get(),
      activityRepository.list(8),
      registrationRepository.metrics(),
    ]);

    const events = eventsResult.data || [];
    const projects = projectsResult.data || [];
    const settings = settingsResult.data || {};
    const activity = activityResult.data || [];
    const registrations = registrationsResult.ok ? registrationsResult.data || {} : null;

    const totalEvents = events.length;
    const openEvents = events.filter((event) => event.status === "open").length;
    const soonEvents = events.filter((event) => event.status === "soon").length;
    const finishedEvents = events.filter((event) => ["closed", "finished", "full"].includes(event.status)).length;
    const draftEvents = events.filter((event) => event.editorialStatus === "draft").length;
    const draftProjects = projects.filter((project) => project.editorialStatus === "draft").length;
    const placeholderProjects = projects.filter((project) => project.status === "Placeholder").length;
    const placeholderSettings = ["emailIsPlaceholder", "phoneIsPlaceholder", "whatsappIsPlaceholder", "addressIsPlaceholder"].filter(
      (key) => settings[key]
    ).length;

    const metricsGrid = element("div", { className: "admin-metrics-grid" }, [
      metricCard("Total de eventos", totalEvents),
      metricCard("Inscrições abertas", openEvents),
      metricCard("Em breve", soonEvents),
      metricCard("Encerrados ou realizados", finishedEvents),
      metricCard("Rascunhos administrativos", draftEvents + draftProjects, "eventos + projetos"),
      metricCard("Conteúdos pendentes de revisão", placeholderProjects + placeholderSettings, "placeholders sinalizados"),
    ]);

    // Contadores de inscricoes: numeros reais da API, sem estimativa.
    const registrationCards = registrations
      ? element("div", { className: "admin-metrics-grid" }, [
          metricCard("Inscrições recebidas", registrations.total ?? 0),
          metricCard(REGISTRATION_STATUS_LABELS.new, registrations.new ?? 0, "aguardando análise"),
          metricCard(REGISTRATION_STATUS_LABELS.reviewing, registrations.reviewing ?? 0),
          metricCard(REGISTRATION_STATUS_LABELS.confirmed, registrations.confirmed ?? 0),
          metricCard(REGISTRATION_STATUS_LABELS.cancelled, registrations.cancelled ?? 0),
          metricCard(REGISTRATION_STATUS_LABELS.rejected, registrations.rejected ?? 0),
        ])
      : element("p", { className: "admin-empty-state", text: "Não foi possível carregar os contadores de inscrições agora." });

    const shortcuts = element("div", { className: "admin-shortcuts" }, [
      element("a", { className: "admin-btn admin-btn--primary", href: "#events/new" }, [
        createIcon("plus", { size: 16 }),
        element("span", { text: "Novo evento" }),
      ]),
      element("a", { className: "admin-btn admin-btn--secondary", href: "#content/home" }, [
        createIcon("content", { size: 16 }),
        element("span", { text: "Editar página inicial" }),
      ]),
      element("a", { className: "admin-btn admin-btn--secondary", href: "#projects" }, [
        createIcon("plus", { size: 16 }),
        element("span", { text: "Adicionar projeto" }),
      ]),
      element("a", { className: "admin-btn admin-btn--secondary", href: "#registrations" }, [
        createIcon("users", { size: 16 }),
        element("span", { text: "Ver inscrições" }),
      ]),
    ]);

    const activityItems = activity.length
      ? activity.map((entry) =>
          element("li", { className: "admin-activity-list__item" }, [
            element("span", { className: "admin-activity-list__label", text: entry.label }),
            element("span", { className: "admin-activity-list__time", text: formatDateTimeBR(entry.at) }),
          ])
        )
      : [element("li", { className: "admin-empty-state", text: "Nenhuma alteração registrada ainda." })];

    const integrationBadge = element("p", { className: "admin-integration-badge" }, [
      createIcon("info", { size: 16 }),
      element("span", { text: "Backend Vercel conectado · publicação por snapshots" }),
    ]);

    clearChildren(container);
    container.appendChild(integrationBadge);
    container.appendChild(metricsGrid);
    container.appendChild(element("h2", { className: "admin-section-title", text: "Inscrições" }));
    container.appendChild(registrationCards);
    container.appendChild(element("h2", { className: "admin-section-title", text: "Atalhos" }));
    container.appendChild(shortcuts);
    container.appendChild(element("h2", { className: "admin-section-title", text: "Últimas alterações auditadas" }));
    container.appendChild(element("ul", { className: "admin-activity-list" }, activityItems));
  },

  unmount() {},
};
