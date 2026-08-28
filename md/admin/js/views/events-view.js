// Listagem de eventos: busca, filtro por modalidade nao implementado como select
// dedicado (a busca textual ja cobre modalidade/categoria), filtro pelos seis
// estados operacionais, filtro por estado editorial, ordenacao, contagem, estado
// vazio e acoes (editar, duplicar, pre-visualizar, arquivar/publicar, excluir).

import { element, clearChildren } from "../dom.js";
import { eventRepository, OPERATIONAL_STATUSES, EDITORIAL_STATUSES } from "../repositories/event-repository.js";
import { createIcon } from "../icons.js";
import { showConfirmDialog } from "../components/confirm-dialog.js";
import { formatDateBR } from "../utils.js";
import { STATUS_LABELS, openEventPreview } from "./event-preview.js";

export { STATUS_LABELS };

export const EDITORIAL_LABELS = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

const state = { query: "", status: "", editorialStatus: "", sort: "" };

function statusBadge(status) {
  return element("span", { className: "admin-badge admin-badge--status-" + status, text: STATUS_LABELS[status] || status });
}

function editorialBadge(status) {
  return element("span", { className: "admin-badge admin-badge--editorial-" + status, text: EDITORIAL_LABELS[status] || status });
}

function openPreview(event, shell) {
  return openEventPreview(event, shell);
}

function buildRow(event, shell, refresh) {
  const previewButton = element(
    "button",
    { type: "button", className: "admin-icon-btn", "aria-label": "Pré-visualizar " + event.title, onClick: () => openPreview(event, shell) },
    [createIcon("eye", { size: 16 })]
  );
  const editLink = element(
    "a",
    { className: "admin-icon-btn", "aria-label": "Editar " + event.title, href: "#events/edit/" + event.id },
    [createIcon("edit", { size: 16 })]
  );
  const duplicateButton = element(
    "button",
    {
      type: "button",
      className: "admin-icon-btn",
      "aria-label": "Duplicar " + event.title,
      onClick: async () => {
        const result = await eventRepository.duplicate(event.id);
        if (result.ok) {
          shell.showToast("Evento duplicado como rascunho.");
          refresh();
        }
      },
    },
    [createIcon("duplicate", { size: 16 })]
  );

  const needsPublish = event.editorialStatus !== "published" || event.revision > event.publishedRevision;
  const publishButton = needsPublish
    ? element(
        "button",
        {
          type: "button",
          className: "admin-icon-btn",
          "aria-label": "Publicar " + event.title,
          onClick: async () => {
            const confirmed = await showConfirmDialog(shell.getDialogRoot(), {
              title: "Publicar evento",
              message: 'O rascunho atual de "' + event.title + '" ficará disponível no site público.',
              confirmLabel: "Publicar",
            });
            if (!confirmed) return;
            const result = await eventRepository.publish(event.id);
            if (result.ok) {
              shell.showToast("Evento publicado.");
              refresh();
            } else shell.showToast(result.error.message);
          },
        },
        [createIcon("check", { size: 16 })]
      )
    : null;
  const archiveButton = event.editorialStatus !== "archived" ? element(
    "button",
    {
      type: "button",
      className: "admin-icon-btn",
      "aria-label": "Arquivar " + event.title,
      onClick: async () => {
        const confirmed = await showConfirmDialog(shell.getDialogRoot(), {
          title: "Arquivar evento",
          message: 'O evento "' + event.title + '" deixará de aparecer no site público.',
          confirmLabel: "Arquivar",
        });
        if (!confirmed) return;
        const result = await eventRepository.archive(event.id);
        if (result.ok) {
          shell.showToast("Estado editorial atualizado.");
          refresh();
        } else shell.showToast(result.error.message);
      },
    },
    [createIcon("archive", { size: 16 })]
  ) : null;

  const deleteButton = element(
    "button",
    {
      type: "button",
      className: "admin-icon-btn admin-icon-btn--danger",
      "aria-label": "Excluir " + event.title,
      onClick: async () => {
        const confirmed = await showConfirmDialog(shell.getDialogRoot(), {
          title: "Excluir evento",
          message: 'Esta ação remove "' + event.title + '" definitivamente dos dados administrativos locais. Não é possível desfazer.',
          confirmLabel: "Excluir",
          destructive: true,
        });
        if (!confirmed) return;
        const result = await eventRepository.delete(event.id);
        if (result.ok) {
          shell.showToast("Evento excluído.");
          refresh();
        } else shell.showToast(result.error.message);
      },
    },
    [createIcon("trash", { size: 16 })]
  );

  return element("article", { className: "admin-row" }, [
    element("div", { className: "admin-row__main" }, [
      element("span", { className: "admin-row__title", text: event.title }),
      element("span", { className: "admin-row__meta", text: (event.sport || "") + " · " + formatDateBR(event.date && event.date.start) }),
    ]),
    element("div", { className: "admin-row__badges" }, [statusBadge(event.status), editorialBadge(event.editorialStatus)]),
    element("div", { className: "admin-row__actions" }, [previewButton, editLink, duplicateButton, publishButton, archiveButton, deleteButton]),
  ]);
}

export const eventsView = {
  async mount(container, params, shell) {
    shell.setTitle("Eventos");
    shell.setBreadcrumb([{ label: "Eventos" }]);
    shell.setActions([
      element("a", { className: "admin-btn admin-btn--primary", href: "#events/new" }, [
        createIcon("plus", { size: 16 }),
        element("span", { text: "Novo evento" }),
      ]),
    ]);

    const root = element("div", { className: "admin-list-page" });

    const toolbar = element("form", { className: "admin-toolbar", role: "search" });
    const searchLabel = element("label", { className: "admin-visually-hidden", for: "eventSearchInput", text: "Buscar eventos" });
    const searchInput = element("input", {
      id: "eventSearchInput",
      type: "search",
      className: "admin-input",
      placeholder: "Buscar por título, modalidade ou categoria",
    });
    searchInput.value = state.query;

    const statusSelect = element(
      "select",
      { className: "admin-select", "aria-label": "Filtrar por estado operacional" },
      [element("option", { value: "", text: "Todos os estados operacionais" })].concat(
        OPERATIONAL_STATUSES.map((value) => element("option", { value, text: STATUS_LABELS[value] }))
      )
    );
    statusSelect.value = state.status;

    const editorialSelect = element(
      "select",
      { className: "admin-select", "aria-label": "Filtrar por estado editorial" },
      [element("option", { value: "", text: "Todos os estados editoriais" })].concat(
        EDITORIAL_STATUSES.map((value) => element("option", { value, text: EDITORIAL_LABELS[value] }))
      )
    );
    editorialSelect.value = state.editorialStatus;

    const sortSelect = element("select", { className: "admin-select", "aria-label": "Ordenar" }, [
      element("option", { value: "", text: "Ordenar por data" }),
      element("option", { value: "title-asc", text: "Ordenar por título" }),
      element("option", { value: "recent", text: "Alterados recentemente" }),
    ]);
    sortSelect.value = state.sort;

    toolbar.appendChild(searchLabel);
    toolbar.appendChild(searchInput);
    toolbar.appendChild(statusSelect);
    toolbar.appendChild(editorialSelect);
    toolbar.appendChild(sortSelect);
    toolbar.addEventListener("submit", (event) => event.preventDefault());

    const countEl = element("p", { className: "admin-count", "aria-live": "polite" });
    const listEl = element("div", { className: "admin-row-list" });

    root.appendChild(toolbar);
    root.appendChild(countEl);
    root.appendChild(listEl);
    container.appendChild(root);

    async function refresh() {
      const result = await eventRepository.list({
        query: state.query || undefined,
        status: state.status || undefined,
        editorialStatus: state.editorialStatus || undefined,
        sort: state.sort || undefined,
      });
      const events = result.data || [];
      countEl.textContent = events.length + (events.length === 1 ? " evento encontrado" : " eventos encontrados");
      clearChildren(listEl);

      if (!events.length) {
        listEl.appendChild(
          element("div", { className: "admin-empty-state" }, [
            element("p", { text: "Nenhum evento encontrado com os filtros atuais." }),
          ])
        );
        return;
      }

      events.forEach((event) => listEl.appendChild(buildRow(event, shell, refresh)));
    }

    searchInput.addEventListener("input", () => {
      state.query = searchInput.value;
      refresh();
    });
    statusSelect.addEventListener("change", () => {
      state.status = statusSelect.value;
      refresh();
    });
    editorialSelect.addEventListener("change", () => {
      state.editorialStatus = editorialSelect.value;
      refresh();
    });
    sortSelect.addEventListener("change", () => {
      state.sort = sortSelect.value;
      refresh();
    });

    await refresh();
  },

  unmount() {},
};
