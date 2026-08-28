// Guarda simples de "alteracoes nao salvas", compartilhado pelo router e por
// qualquer view com formulario. Cada view chama register(getSnapshot) no mount,
// clear() apos salvar com sucesso, e release() no unmount.

let currentPredicate = null;

export const dirtyGuard = {
  register(predicate) {
    currentPredicate = predicate;
  },
  isDirty() {
    return typeof currentPredicate === "function" ? Boolean(currentPredicate()) : false;
  },
  clear() {
    currentPredicate = null;
  },
  release() {
    currentPredicate = null;
  },
};

// beforeunload global unico (registrado uma vez em admin-app.js), nao por view.
export function installBeforeUnloadGuard() {
  window.addEventListener("beforeunload", (event) => {
    if (!dirtyGuard.isDirty()) return undefined;
    event.preventDefault();
    event.returnValue = "";
    return "";
  });
}
