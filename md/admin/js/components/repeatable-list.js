// Lista de itens reordenaveis por botoes (nunca so por arrastar), reutilizada
// pelo editor de evento (categorias, programacao, premiacao, patrocinadores) e
// pelo editor de conteudo (principios, modulos de atuacao, metricas, links de
// navegacao).

import { element, clearChildren } from "../dom.js";
import { createIcon } from "../icons.js";
import { createReorderControls } from "./reorder-list.js";

export function renderRepeatableList(config) {
  const listEl = element("div", { className: "admin-repeatable-list" });
  const addButton = element(
    "button",
    {
      type: "button",
      className: "admin-btn admin-btn--secondary",
      onClick: () => {
        config.items.push(config.createEmpty());
        renderList();
      },
    },
    [createIcon("plus", { size: 16 }), element("span", { text: "Adicionar " + config.itemLabel })]
  );

  function swap(a, b) {
    const temp = config.items[a];
    config.items[a] = config.items[b];
    config.items[b] = temp;
  }

  function renderList() {
    clearChildren(listEl);
    if (!config.items.length) {
      listEl.appendChild(element("p", { className: "admin-empty-state", text: "Nenhum item adicionado." }));
    }
    config.items.forEach((item, index) => {
      const fieldsContainer = element("div", { className: "admin-repeatable-item__fields" });
      config.renderItemFields(fieldsContainer, item, index);

      const removeButton = element(
        "button",
        {
          type: "button",
          className: "admin-icon-btn admin-icon-btn--danger",
          "aria-label": "Remover " + config.itemLabel + " " + (index + 1),
          disabled: Boolean(config.minItems) && config.items.length <= config.minItems,
          onClick: () => {
            config.items.splice(index, 1);
            renderList();
          },
        },
        [createIcon("trash", { size: 16 })]
      );

      const reorderControls = createReorderControls({
        label: config.itemLabel,
        disableUp: index === 0,
        disableDown: index === config.items.length - 1,
        onMoveUp: () => {
          swap(index, index - 1);
          renderList();
        },
        onMoveDown: () => {
          swap(index, index + 1);
          renderList();
        },
      });

      listEl.appendChild(
        element("div", { className: "admin-repeatable-item" }, [
          element("div", { className: "admin-repeatable-item__header" }, [
            element("span", { className: "admin-repeatable-item__index", text: config.itemLabel + " " + (index + 1) }),
            reorderControls,
            removeButton,
          ]),
          fieldsContainer,
        ])
      );
    });
  }

  renderList();
  config.container.appendChild(listEl);
  config.container.appendChild(addButton);
}
