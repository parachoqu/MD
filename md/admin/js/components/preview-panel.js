// Painel de pre-visualizacao compartilhado (evento/projeto/conteudo/imagem).
// Renderiza um mini "chrome" com 3 larguras aproximadas e delega o conteudo em
// si para renderContent(container), que cada view implementa usando element()/
// textContent -- nunca HTML digitado injetado (exigencia explicita da tarefa).

import { element, clearChildren } from "../dom.js";

const SIZES = [
  { key: "mobile", label: "Mobile", width: 390 },
  { key: "tablet", label: "Tablet", width: 768 },
  { key: "desktop", label: "Desktop", width: 1440 },
];

export function createPreviewPanel(config) {
  let activeIndex = 2;

  const frame = element("div", { className: "admin-preview__frame" });

  const sizeButtons = SIZES.map((size, index) =>
    element("button", {
      type: "button",
      className: "admin-tab",
      text: size.label,
      "aria-pressed": String(index === activeIndex),
      onClick: () => {
        activeIndex = index;
        update();
      },
    })
  );

  function update() {
    sizeButtons.forEach((button, index) => {
      const isActive = index === activeIndex;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
    frame.style.width = SIZES[activeIndex].width + "px";
    clearChildren(frame);
    config.renderContent(frame);
  }

  const toolbar = element("div", { className: "admin-preview__toolbar" }, [
    element("div", { className: "admin-preview__sizes", role: "group", "aria-label": "Largura da pré-visualização" }, sizeButtons),
    element("span", { className: "admin-tag admin-tag--demo", text: "Rascunho não publicado" }),
  ]);

  const children = [toolbar, element("div", { className: "admin-preview__viewport" }, [frame])];

  if (config.publicUrl) {
    children.push(
      element("a", {
        className: "admin-link-btn",
        href: config.publicUrl,
        target: "_blank",
        rel: "noopener",
        text: config.publicUrlLabel || "Ver rota pública real",
      })
    );
  }

  const root = element("div", { className: "admin-preview" }, children);
  update();

  return { root, refresh: update };
}
