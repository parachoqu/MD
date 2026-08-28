// Renderizacao de pre-visualizacao de evento compartilhada entre a listagem
// (events-view.js) e o editor (event-editor-view.js, que precisa pre-visualizar
// o rascunho ainda nao salvo). Sempre via element()/textContent -- nunca HTML
// digitado injetado.

import { element } from "../dom.js";
import { openDialog } from "../components/dialog-shell.js";
import { createPreviewPanel } from "../components/preview-panel.js";

export const STATUS_LABELS = {
  open: "Inscrições abertas",
  soon: "Em breve",
  closed: "Encerradas",
  finished: "Realizado",
  cancelled: "Cancelado",
  full: "Lotado",
};

export function renderEventPreviewContent(event) {
  const rows = [
    ["Modalidade", event.sport],
    ["Data", (event.date && event.date.label) || "A confirmar"],
    ["Local", event.location ? [event.location.venue, event.location.city].filter(Boolean).join(", ") : "A confirmar"],
    ["Status", STATUS_LABELS[event.status] || event.status],
    ["Categorias", (event.categories || []).map((c) => c.name).join(", ") || "-"],
  ];
  return element("div", { className: "admin-preview-event" }, [
    element("span", { className: "admin-tag", text: event.sport || "" }),
    element("h3", { text: event.title || "(sem título)" }),
    element("p", { text: event.summary || "" }),
    element(
      "dl",
      { className: "admin-preview-event__facts" },
      rows.flatMap(([label, value]) => [element("dt", { text: label }), element("dd", { text: value || "-" })])
    ),
  ]);
}

export function openEventPreview(event, shell) {
  return openDialog(shell.getDialogRoot(), {
    size: "large",
    ariaLabel: "Pré-visualização do evento",
    render(close) {
      const closeButton = element("button", {
        type: "button",
        className: "admin-btn admin-btn--ghost",
        text: "Fechar",
        "data-autofocus": "",
        onClick: () => close(null),
      });
      const preview = createPreviewPanel({
        renderContent(target) {
          target.appendChild(renderEventPreviewContent(event));
        },
        publicUrl: event.slug ? "../evento.html?evento=" + encodeURIComponent(event.slug) : null,
      });
      return element("div", {}, [
        element("div", { className: "admin-dialog__header" }, [
          element("h2", { className: "admin-dialog__title", text: "Pré-visualização — " + (event.title || "evento") }),
          closeButton,
        ]),
        preview.root,
      ]);
    },
  });
}
