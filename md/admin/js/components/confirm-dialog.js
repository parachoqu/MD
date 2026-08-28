// Dialogo de confirmacao acessivel e generico, usado para toda acao destrutiva
// ou sensivel (excluir, arquivar, publicar no modo local, restaurar seed).

import { element } from "../dom.js";
import { openDialog } from "./dialog-shell.js";

export function showConfirmDialog(dialogRoot, options) {
  return openDialog(dialogRoot, {
    role: "alertdialog",
    escapeValue: false,
    render(close) {
      const cancelButton = element("button", {
        type: "button",
        className: "admin-btn admin-btn--ghost",
        text: options.cancelLabel || "Cancelar",
        onClick: () => close(false),
      });
      const confirmButton = element("button", {
        type: "button",
        className: "admin-btn " + (options.destructive ? "admin-btn--danger" : "admin-btn--primary"),
        text: options.confirmLabel || "Confirmar",
        "data-autofocus": "",
        onClick: () => close(true),
      });
      return element("div", {}, [
        element("h2", { className: "admin-dialog__title", text: options.title }),
        element("p", { className: "admin-dialog__message", text: options.message }),
        element("div", { className: "admin-dialog__actions" }, [cancelButton, confirmButton]),
      ]);
    },
  });
}
