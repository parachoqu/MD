/**
 * Motion - Cadência Estruturada.
 * Todo movimento responde a uma ação, orienta leitura ou confirma mudança.
 * Em prefers-reduced-motion nada translada e nada anima continuamente.
 */

const REVEAL_SELECTOR = "[data-animate]";
const STATIC_TITLE_SELECTOR =
  "h1, h2, h3, .section-title, .hero__title-strong, .hero__title-thin, .event-row__title";

let revealObserver = null;
let reduceMotion = false;

export function initMotion() {
  reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  prepareMotionScope(document);

  if (!reduceMotion && "IntersectionObserver" in window) {
    // A classe libera o estado inicial oculto no CSS. Sem JS o conteúdo
    // permanece visível por padrão.
    document.documentElement.classList.add("has-motion");
    // threshold 0 com margem inferior negativa: blocos altos revelam assim
    // que entram de fato na leitura, sem depender da própria altura.
    revealObserver = new IntersectionObserver(onReveal, {
      threshold: 0,
      rootMargin: "0px 0px -8% 0px",
    });
  }

  revealScope(document);
  initScrollProgress(reduceMotion);
  initCounters(reduceMotion);
}

/**
 * Registra elementos [data-animate] de um trecho recém-renderizado.
 * Necessário para listas que são reconstruídas depois do initMotion
 * (catálogo de eventos, projetos, detalhe do evento).
 *
 * `immediate` mostra o conteúdo sem esperar o scroll: é o caso de uma
 * lista redesenhada por busca ou filtro, em que o resultado precisa
 * aparecer no mesmo gesto que o pediu.
 */
export function revealScope(root = document, { immediate = false } = {}) {
  if (!root) return;

  const scope = root.nodeType === 1 || root.nodeType === 9 ? root : document;
  prepareMotionScope(scope);
  const items = collectRevealItems(scope);
  if (!items.length) return;

  if (!revealObserver || immediate) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  items.forEach((item) => {
    if (item.classList.contains("is-visible")) return;
    revealObserver.observe(item);
  });
}

function collectRevealItems(scope) {
  const items = Array.from(scope.querySelectorAll(REVEAL_SELECTOR));
  if (scope.nodeType === 1 && scope.matches?.(REVEAL_SELECTOR)) items.unshift(scope);
  return items;
}

function prepareMotionScope(scope) {
  const roots = scope.nodeType === 1 || scope.nodeType === 9 ? [scope] : [document];

  roots.forEach((root) => {
    root.querySelectorAll?.("[data-stagger]").forEach((group) => {
      Array.from(group.children).forEach((item, index) => {
        item.dataset.animate = "";
        item.style.setProperty("--reveal-delay", `${Math.min(index * 45, 225)}ms`);
      });
    });

    const candidates = Array.from(root.querySelectorAll?.(REVEAL_SELECTOR) || []);
    if (root.nodeType === 1 && root.matches?.(REVEAL_SELECTOR)) candidates.unshift(root);
    candidates.forEach((item) => {
      if (item.matches(STATIC_TITLE_SELECTOR) || item.querySelector(STATIC_TITLE_SELECTOR)) {
        item.removeAttribute("data-animate");
      }
    });
  });
}

function onReveal(entries, observer) {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("is-visible");
    observer.unobserve(entry.target);
  });
}

function initScrollProgress(reduce) {
  const bar = document.getElementById("scrollProgressBar");
  const track = document.getElementById("scrollProgress");
  if (!bar || !track) return;

  if (reduce) {
    track.hidden = true;
    return;
  }

  let framePending = false;
  const update = () => {
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? Math.min(Math.max(window.scrollY / scrollable, 0), 1) : 0;
    bar.style.transform = `scaleX(${ratio.toFixed(4)})`;
    framePending = false;
  };

  const requestUpdate = () => {
    if (framePending) return;
    framePending = true;
    window.requestAnimationFrame(update);
  };

  update();
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate, { passive: true });
}

function initCounters(reduce) {
  const counters = Array.from(document.querySelectorAll("[data-counter]"));
  if (!counters.length) return;

  const setFinal = () => {
    counters.forEach((counter) => {
      counter.textContent = Number(counter.dataset.target || 0).toLocaleString("pt-BR");
    });
  };

  if (reduce || !("IntersectionObserver" in window)) {
    setFinal();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.35 }
  );

  counters.forEach((counter) => observer.observe(counter));
}

function animateCounter(counter) {
  const target = Number(counter.dataset.target || 0);
  const duration = 700;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    counter.textContent = Math.round(target * progress).toLocaleString("pt-BR");
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}
