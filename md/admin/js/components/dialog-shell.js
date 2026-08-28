// Mecanica compartilhada de todo dialogo acessivel do admin (confirmacao,
// seletor de midia, pre-visualizacao): trap de foco, Escape, clique fora fecha,
// devolucao de foco ao elemento que abriu. Cada chamador so fornece o conteudo
// via render(close).

import { element, clearChildren, trapFocus } from "../dom.js";

export function openDialog(dialogRoot, options) {
  const trigger = document.activeElement;
  let resolvePromise;
  const promise = new Promise((resolve) => {
    resolvePromise = resolve;
  });
  const escapeValue = options.escapeValue === undefined ? null : options.escapeValue;

  function close(result) {
    document.removeEventListener("keydown", onKeydown);
    clearChildren(dialogRoot);
    document.body.classList.remove("admin-scroll-lock");
    if (trigger && document.body.contains(trigger)) trigger.focus();
    resolvePromise(result);
  }

  function onKeydown(event) {
    if (event.key === "Escape") {
      close(escapeValue);
      return;
    }
    trapFocus(dialog, event);
  }

  const dialog = options.render(close);
  dialog.classList.add("admin-dialog");
  if (options.size === "large") dialog.classList.add("admin-dialog--large");
  dialog.setAttribute("role", options.role || "dialog");
  dialog.setAttribute("aria-modal", "true");
  if (options.ariaLabel) dialog.setAttribute("aria-label", options.ariaLabel);

  const backdrop = element("div", { className: "admin-dialog-backdrop" }, [dialog]);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close(escapeValue);
  });

  clearChildren(dialogRoot);
  dialogRoot.appendChild(backdrop);
  document.body.classList.add("admin-scroll-lock");
  document.addEventListener("keydown", onKeydown);

  const autofocusTarget = dialog.querySelector("[data-autofocus]") || dialog.querySelector("button, input, a[href]");
  if (autofocusTarget) autofocusTarget.focus();

  return promise;
}
