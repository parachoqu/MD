// Hash router do painel admin. Cada view exporta { mount(container, params, shell),
// unmount() }. O router sempre chama unmount() da view anterior antes de montar a
// proxima (mesma disciplina de limpeza de js/mobile.js) e reavalia a sessao a cada
// troca de rota.

import { clearChildren } from "./dom.js";
import { requireSession } from "./auth/auth-guard.js";
import { dirtyGuard } from "./dirty-guard.js";
import { dashboardView } from "./views/dashboard-view.js";
import { eventsView } from "./views/events-view.js";
import { eventEditorView } from "./views/event-editor-view.js";
import { contentView } from "./views/content-view.js";
import { projectsView } from "./views/projects-view.js";
import { mediaView } from "./views/media-view.js";
import { settingsView } from "./views/settings-view.js";

const ROUTES = [
  { pattern: ["dashboard"], view: dashboardView },
  { pattern: ["events"], view: eventsView },
  { pattern: ["events", "new"], view: eventEditorView },
  { pattern: ["events", "edit", ":id"], view: eventEditorView },
  { pattern: ["content", "home"], view: contentView },
  { pattern: ["projects"], view: projectsView },
  { pattern: ["media"], view: mediaView },
  { pattern: ["settings"], view: settingsView },
];

function parseHash() {
  return window.location.hash.replace(/^#/, "").split("/").filter(Boolean);
}

function matchRoute(segments) {
  for (const route of ROUTES) {
    if (route.pattern.length !== segments.length) continue;
    const params = {};
    let matched = true;
    for (let i = 0; i < route.pattern.length; i += 1) {
      const part = route.pattern[i];
      if (part.charAt(0) === ":") {
        params[part.slice(1)] = segments[i];
      } else if (part !== segments[i]) {
        matched = false;
        break;
      }
    }
    if (matched) return { route, params };
  }
  return null;
}

let currentView = null;
let currentHash = null;

export function initRouter(shell) {
  async function handleChange() {
    const session = await requireSession();
    if (!session) return;

    const segments = parseHash();
    const effectiveSegments = segments.length ? segments : ["dashboard"];
    const match = matchRoute(effectiveSegments);

    if (!match) {
      window.location.hash = "#dashboard";
      return;
    }

    const nextHash = "#" + effectiveSegments.join("/");

    // Reversao apos o usuario cancelar a troca de rota com formulario sujo: o
    // hash ja mudou fisicamente antes deste handler rodar, entao devolvemos o
    // hash anterior, o que dispara um novo hashchange -- reconhecido aqui como
    // "mesmo destino de onde ja estamos" e ignorado, sem remontar a view.
    if (nextHash === currentHash) return;

    if (currentHash && dirtyGuard.isDirty()) {
      const confirmed = window.confirm(
        "Existem alterações não salvas nesta tela. Deseja sair mesmo assim e perdê-las?"
      );
      if (!confirmed) {
        window.location.hash = currentHash;
        return;
      }
      dirtyGuard.clear();
    }

    if (currentView && typeof currentView.unmount === "function") {
      try {
        currentView.unmount();
      } catch (error) {
        console.error("Erro ao desmontar view administrativa", error);
      }
    }

    currentHash = nextHash;
    currentView = match.route.view;
    const container = shell.getMainContainer();
    clearChildren(container);
    shell.setActions([]);
    shell.setActiveRoute(effectiveSegments[0]);
    shell.closeDrawer();

    try {
      await currentView.mount(container, match.params, shell);
    } catch (error) {
      console.error("Erro ao montar view administrativa", error);
    }
    container.focus();
  }

  window.addEventListener("hashchange", handleChange);
  handleChange();
}
