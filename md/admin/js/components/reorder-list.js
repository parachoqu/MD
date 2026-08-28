// Par de botoes "mover para cima/baixo" reutilizado em toda lista reordenavel
// do painel (categorias do evento, itens repetiveis de conteudo, projetos). A
// tarefa exige que a reordenacao nunca dependa so de arrastar.

import { element } from "../dom.js";
import { createIcon } from "../icons.js";

export function createReorderControls(config) {
  const upButton = element(
    "button",
    {
      type: "button",
      className: "admin-icon-btn",
      "aria-label": "Mover " + config.label + " para cima",
      disabled: Boolean(config.disableUp),
      onClick: config.onMoveUp,
    },
    [createIcon("moveUp", { size: 16 })]
  );

  const downButton = element(
    "button",
    {
      type: "button",
      className: "admin-icon-btn",
      "aria-label": "Mover " + config.label + " para baixo",
      disabled: Boolean(config.disableDown),
      onClick: config.onMoveDown,
    },
    [createIcon("moveDown", { size: 16 })]
  );

  return element("div", { className: "admin-reorder-controls" }, [upButton, downButton]);
}
