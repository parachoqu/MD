// Seletor de midia reutilizavel nos editores de evento, projeto, conteudo e
// configuracoes. Abre um dialogo acessivel sobre a biblioteca (media-repository),
// com busca; ao escolher um item, resolve a Promise com o registro de midia.

import { element, clearChildren } from "../dom.js";
import { openDialog } from "./dialog-shell.js";
import { mediaRepository } from "../repositories/media-repository.js";

export function openMediaPicker(dialogRoot) {
  return openDialog(dialogRoot, {
    size: "large",
    ariaLabel: "Selecionar mídia",
    render(close) {
      const grid = element("div", { className: "admin-media-picker__grid" });
      const searchInput = element("input", {
        type: "search",
        className: "admin-input",
        placeholder: "Buscar por nome ou texto alternativo",
        "aria-label": "Buscar mídia",
        "data-autofocus": "",
      });

      async function renderGrid(query) {
        clearChildren(grid);
        grid.appendChild(element("p", { className: "admin-empty-state", text: "Carregando…" }));
        const result = await mediaRepository.list({ query });
        clearChildren(grid);
        const items = result.data;
        if (!items.length) {
          grid.appendChild(element("p", { className: "admin-empty-state", text: "Nenhuma mídia encontrada." }));
          return;
        }
        for (const item of items) {
          const url = await mediaRepository.getPreviewUrl(item.id);
          const figure = url
            ? element("img", { src: url, alt: item.alt || "", loading: "lazy" })
            : element("span", { className: "admin-media-picker__placeholder", text: "Sem preview" });
          const button = element(
            "button",
            { type: "button", className: "admin-media-picker__item", onClick: () => close(item) },
            [figure, element("span", { className: "admin-media-picker__label", text: item.label })]
          );
          grid.appendChild(button);
        }
      }

      searchInput.addEventListener("input", () => renderGrid(searchInput.value));

      const closeButton = element("button", {
        type: "button",
        className: "admin-btn admin-btn--ghost",
        text: "Cancelar",
        onClick: () => close(null),
      });

      const dialog = element("div", {}, [
        element("div", { className: "admin-dialog__header" }, [
          element("h2", { className: "admin-dialog__title", text: "Selecionar mídia" }),
          closeButton,
        ]),
        searchInput,
        grid,
      ]);

      renderGrid("");
      return dialog;
    },
  });
}
