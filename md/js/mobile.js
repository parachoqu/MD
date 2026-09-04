/**
 * App Shell M&D - comportamento exclusivo das telas de toque.
 *
 * Nada aqui inicializa acima de 767px. Ao cruzar o breakpoint a
 * montagem é desfeita por inteiro: listeners removidos, observers
 * desconectados, elementos exclusivos devolvidos a [hidden],
 * classes de body limpas e atributos restaurados.
 *
 * Este módulo complementa - nunca duplica - navigation.js,
 * projects.js, regulation.js e os módulos de evento e inscrição.
 * Toggle do menu, foco preso dos modais existentes, expansão do
 * regulamento e estado ativo por seção continuam sendo deles.
 */

const MOBILE_QUERY = "(max-width: 767px)";

/** Seção da home -> destino da tab bar. */
const SECTION_TO_TAB = {
  inicio: "inicio",
  sobre: "inicio",
  atuacao: "inicio",
  eventos: "eventos",
  projetos: "projetos",
  impacto: "projetos",
  contato: "contato",
};

/** Candidatos da navegação local do evento, em ordem de prioridade. */
const EVENT_NAV_ITEMS = [
  { id: "evt-sobre", label: "Resumo" },
  { id: "evt-inscricao", label: "Inscrição" },
  { id: "regulamento", label: "Regulamento" },
  { id: "evt-premiacoes", label: "Premiação" },
  { id: "evt-categorias", label: "Categorias" },
  { id: "evt-cronograma", label: "Formato" },
  { id: "evt-duvidas", label: "Dúvidas" },
];

const CHEVRON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M14 5 7 12l7 7"/></svg>';

export function initMobile() {
  const query = window.matchMedia(MOBILE_QUERY);
  let unmount = null;

  const sync = () => {
    if (query.matches && !unmount) {
      unmount = mount();
      return;
    }

    if (!query.matches && unmount) {
      unmount();
      unmount = null;
    }
  };

  query.addEventListener("change", sync);
  sync();
}

function mount() {
  const cleanups = [];

  const add = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    cleanups.push(() => target.removeEventListener(type, handler, options));
  };

  const observe = (target, callback, init) => {
    const observer = new MutationObserver(callback);
    observer.observe(target, init);
    cleanups.push(() => observer.disconnect());
    return observer;
  };

  document.documentElement.classList.add("md-shell");
  cleanups.push(() => document.documentElement.classList.remove("md-shell"));

  const shell = revealShell(cleanups);
  initTabs(shell.tabbar, observe);
  initMenu(add, observe, cleanups);
  const eventNav = initEventNav(cleanups);
  const docBar = initRegulationViewer(add, observe, cleanups);
  initRegistrationViewport(add, cleanups);

  initPrintGuard(add, observe, cleanups, () => [
    ...shell.elements,
    eventNav(),
    docBar(),
    document.querySelector(".md-menu-close"),
  ]);

  return () => {
    while (cleanups.length) {
      const cleanup = cleanups.pop();
      try {
        cleanup();
      } catch (error) {
        /* uma falha isolada não pode impedir o restante da desmontagem */
      }
    }
  };
}

/**
 * A marcação exclusiva do shell nasce com [hidden] no HTML: no
 * desktop ela nunca sai de display:none nem entra na árvore de
 * acessibilidade, e sem JavaScript nada é inserido no layout.
 */
function revealShell(cleanups) {
  const elements = [
    document.getElementById("mdTabBar"),
    document.querySelector(".md-appbar__back"),
    document.querySelector(".md-appbar__context"),
  ].filter(Boolean);

  elements.forEach((element) => {
    element.hidden = false;
  });

  cleanups.push(() => {
    elements.forEach((element) => {
      element.hidden = true;
    });
  });

  return { elements, tabbar: document.getElementById("mdTabBar") };
}

/**
 * O destino ativo espelha a classe que o IntersectionObserver de
 * navigation.js já escreve em #mainNav. Uma única fonte de verdade:
 * nenhum segundo observador de seção é criado aqui.
 */
function initTabs(tabbar, observe) {
  if (!tabbar) return;

  const tabs = Array.from(tabbar.querySelectorAll("[data-md-tab]"));
  if (!tabs.length) return;

  const setActive = (key) => {
    tabs.forEach((tab) => {
      if (tab.dataset.mdTab === key) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
  };

  // Catálogo e detalhe pertencem sempre ao destino Eventos.
  if (!document.getElementById("featuredEvents")) {
    setActive("eventos");
    return;
  }

  const navLinks = Array.from(document.querySelectorAll("#mainNav a"));
  if (!navLinks.length) {
    setActive("inicio");
    return;
  }

  const readActive = () => {
    const active = navLinks.find((link) => link.classList.contains("is-active"));
    const section = active?.hash ? active.hash.slice(1) : "";
    setActive(SECTION_TO_TAB[section] || "inicio");
  };

  navLinks.forEach((link) => {
    observe(link, readActive, { attributes: true, attributeFilter: ["class"] });
  });

  readActive();
}

/**
 * navigation.js continua dono do toggle, do aria-expanded, do
 * body.menu-open e do Escape. Aqui entram apenas foco preso, foco
 * inicial, retorno de foco, rótulo do acionador e a linha de
 * fechamento ao alcance do polegar.
 */
function initMenu(add, observe, cleanups) {
  const nav = document.getElementById("mainNav");
  const toggle = document.getElementById("menuToggle");
  if (!nav || !toggle) return;

  const openLabel = toggle.getAttribute("aria-label") || "Abrir menu";
  cleanups.push(() => toggle.setAttribute("aria-label", openLabel));

  const closeRow = document.createElement("button");
  closeRow.type = "button";
  closeRow.className = "md-menu-close";
  closeRow.textContent = "Fechar menu";
  add(closeRow, "click", () => {
    if (nav.classList.contains("is-open")) toggle.click();
  });
  nav.append(closeRow);
  cleanups.push(() => closeRow.remove());

  let open = nav.classList.contains("is-open");
  let lastFocus = null;

  observe(
    nav,
    () => {
      const next = nav.classList.contains("is-open");
      if (next === open) return;
      open = next;

      if (open) {
        lastFocus = document.activeElement;
        toggle.setAttribute("aria-label", "Fechar menu");
        const first = nav.querySelector("a[href]");
        window.requestAnimationFrame(() => first?.focus());
        return;
      }

      toggle.setAttribute("aria-label", openLabel);
      if (lastFocus && lastFocus !== document.body && document.contains(lastFocus)) {
        lastFocus.focus();
      } else {
        toggle.focus();
      }
      lastFocus = null;
    },
    { attributes: true, attributeFilter: ["class"] }
  );

  add(document, "keydown", (event) => {
    if (event.key !== "Tab" || !open) return;

    const items = [...nav.querySelectorAll("a[href], button:not([disabled])"), toggle];
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // Fechar ao sair do mobile, sem disparar o retorno de foco: o
  // observer já foi desconectado quando esta limpeza roda.
  cleanups.push(() => {
    if (nav.classList.contains("is-open")) toggle.click();
  });
}

/**
 * Atalhos para seções que já existem no documento. Links âncora
 * reais, no fluxo - nunca uma segunda navegação fixa.
 */
function initEventNav(cleanups) {
  let nav = null;
  const main = document.querySelector("#eventDetailRoot .event-main-content");

  if (main) {
    const items = EVENT_NAV_ITEMS.filter((item) => document.getElementById(item.id)).slice(0, 4);

    if (items.length >= 2) {
      nav = document.createElement("nav");
      nav.className = "md-eventnav";
      nav.setAttribute("aria-label", "Seções deste evento");

      items.forEach((item) => {
        const link = document.createElement("a");
        link.href = `#${item.id}`;
        link.textContent = item.label;
        nav.append(link);
      });

      main.before(nav);
      cleanups.push(() => nav.remove());
    }
  }

  return () => nav;
}

/**
 * Visualizador de documento. regulation.js continua responsável por
 * expandir, recolher, deep link, tabela responsiva e impressão; a
 * toolbar apenas aciona os controles que já existem.
 */
function initRegulationViewer(add, observe, cleanups) {
  const section = document.querySelector(".event-regulation");
  const toggle = section?.querySelector("#regulationToggle");
  const printButton = section?.querySelector("#regulationPrint");
  if (!section || !toggle || !printButton) return () => null;

  const bar = document.createElement("div");
  bar.className = "md-docbar";

  const back = document.createElement("button");
  back.type = "button";
  back.className = "md-docbar__back";
  back.innerHTML = `${CHEVRON}<span>Voltar</span>`;
  back.setAttribute("aria-label", "Voltar ao evento e fechar o regulamento");

  const title = document.createElement("span");
  title.className = "md-docbar__title";
  title.textContent = "Regulamento";

  const print = document.createElement("button");
  print.type = "button";
  print.className = "md-docbar__print";
  print.textContent = "Imprimir";
  print.setAttribute("aria-label", "Imprimir o regulamento ou salvar em PDF");

  bar.append(back, title, print);

  add(back, "click", () => toggle.click());
  add(print, "click", () => printButton.click());

  const isPrinting = () => document.body.classList.contains("is-printing-regulation");

  let open = section.classList.contains("is-expanded");
  let lastFocus = null;
  let pushed = false;

  const applyOpen = (initial = false) => {
    document.body.classList.add("md-doc-open");
    // Durante a impressão o documento é expandido por regulation.js:
    // a interface do aplicativo não deve entrar na folha.
    if (isPrinting()) return;
    if (!bar.isConnected) section.prepend(bar);
    if (!initial) window.requestAnimationFrame(() => back.focus());

    if (window.location.hash !== "#regulamento") {
      try {
        window.history.pushState({ mdDoc: true }, "", "#regulamento");
        pushed = true;
      } catch (error) {
        pushed = false;
      }
    }
  };

  const applyClose = () => {
    document.body.classList.remove("md-doc-open");
    bar.remove();

    if (lastFocus && lastFocus !== document.body && document.contains(lastFocus)) {
      lastFocus.focus();
    } else if (!isPrinting()) {
      toggle.focus();
    }
    lastFocus = null;

    if (pushed) {
      pushed = false;
      // pushState não dispara hashchange; o back devolve o hash
      // anterior e revealAnchor sai cedo, sem reabrir.
      window.history.back();
    }
  };

  observe(
    section,
    () => {
      const next = section.classList.contains("is-expanded");
      if (next === open) return;
      if (next) lastFocus = document.activeElement;
      open = next;
      if (open) applyOpen();
      else applyClose();
    },
    { attributes: true, attributeFilter: ["class"] }
  );

  add(document, "keydown", (event) => {
    if (event.key !== "Escape" || !open) return;
    event.preventDefault();
    toggle.click();
  });

  add(window, "popstate", () => {
    if (!open || window.location.hash === "#regulamento") return;
    pushed = false;
    toggle.click();
  });

  cleanups.push(() => {
    document.body.classList.remove("md-doc-open");
    bar.remove();
  });

  // Deep link: regulation.js já expandiu antes desta montagem.
  if (open) applyOpen(true);

  return () => (bar.isConnected ? bar : null);
}

/**
 * Teclado virtual: o diálogo de inscrição acompanha o viewport
 * visual, e um campo que ficaria coberto é trazido para a área
 * visível sem mover a página.
 */
function initRegistrationViewport(add, cleanups) {
  const viewport = window.visualViewport;

  if (viewport) {
    const root = document.documentElement;
    const sync = () => {
      root.style.setProperty("--md-vvh", `${Math.round(viewport.height)}px`);
      root.style.setProperty("--md-vvt", `${Math.round(viewport.offsetTop)}px`);
    };

    add(viewport, "resize", sync, { passive: true });
    add(viewport, "scroll", sync, { passive: true });
    sync();

    cleanups.push(() => {
      root.style.removeProperty("--md-vvh");
      root.style.removeProperty("--md-vvt");
    });
  }

  add(document, "focusin", (event) => {
    const field = event.target?.closest?.(
      ".registration-field input, .registration-field select, .registration-step textarea"
    );
    const scroller = field?.closest(".registration-step");
    if (!scroller) return;

    window.setTimeout(() => {
      if (!document.contains(field)) return;
      const rect = field.getBoundingClientRect();
      const bounds = scroller.getBoundingClientRect();
      if (rect.bottom > bounds.bottom - 8 || rect.top < bounds.top + 8) {
        field.scrollIntoView({ block: "center" });
      }
    }, 140);
  });
}

/**
 * A folha mobile não alcança o page box A4, então os elementos do
 * shell precisam sair da impressão por atributo. Cobre tanto o
 * botão de imprimir do regulamento (que aplica a classe direto)
 * quanto o Ctrl+P do navegador.
 */
function initPrintGuard(add, observe, cleanups, getShellElements) {
  const hidden = new Set();

  const hide = () => {
    getShellElements()
      .filter(Boolean)
      .forEach((element) => {
        if (element.hidden) return;
        element.hidden = true;
        hidden.add(element);
      });
  };

  const restore = () => {
    hidden.forEach((element) => {
      element.hidden = false;
    });
    hidden.clear();
  };

  const hideNow = () => {
    hide();
    // Observers de regulation.js podem inserir a toolbar no mesmo
    // tick: uma segunda passada garante a folha limpa.
    queueMicrotask(hide);
  };

  add(window, "beforeprint", hideNow);
  add(window, "afterprint", restore);

  let printing = document.body.classList.contains("is-printing-regulation");

  observe(
    document.body,
    () => {
      const next = document.body.classList.contains("is-printing-regulation");
      if (next === printing) return;
      printing = next;
      if (printing) hideNow();
      else restore();
    },
    { attributes: true, attributeFilter: ["class"] }
  );

  cleanups.push(restore);
}
