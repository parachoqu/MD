/**
 * Regulamento incorporado ao detalhe do evento: expansão acessível,
 * deep link, tabela responsiva e impressão isolada em três folhas A4.
 */
export function initRegulation() {
  const section = document.querySelector(".event-regulation");
  const document_ = section?.querySelector(".regulation-document");
  const toggle = section?.querySelector("#regulationToggle");
  const printButton = section?.querySelector("#regulationPrint");
  if (!section || !document_ || !toggle || !printButton) return;

  const collapsedLabel = toggle.textContent.trim();
  const updateTables = initScrollableTables(document_);
  let expandedBeforePrint = null;

  const setExpanded = (expanded) => {
    document_.hidden = !expanded;
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.textContent = expanded ? "Recolher regulamento" : collapsedLabel;
    section.classList.toggle("is-expanded", expanded);
    if (expanded) window.requestAnimationFrame(updateTables);
  };

  const revealAnchor = () => {
    if (window.location.hash !== "#regulamento") return;
    setExpanded(true);
    window.requestAnimationFrame(() => {
      section.scrollIntoView({ block: "start" });
    });
  };

  const preparePrint = () => {
    if (expandedBeforePrint === null) expandedBeforePrint = !document_.hidden;
    setExpanded(true);
    document.body.classList.add("is-printing-regulation");
  };

  const restoreAfterPrint = () => {
    document.body.classList.remove("is-printing-regulation");
    if (expandedBeforePrint === null) return;
    const shouldRemainExpanded = expandedBeforePrint;
    expandedBeforePrint = null;
    setExpanded(shouldRemainExpanded);
  };

  toggle.addEventListener("click", () => {
    setExpanded(document_.hidden);
  });

  printButton.addEventListener("click", () => {
    preparePrint();
    window.print();
  });

  document.querySelectorAll('a[href="#regulamento"]').forEach((link) => {
    link.addEventListener("click", () => {
      window.requestAnimationFrame(revealAnchor);
    });
  });

  window.addEventListener("hashchange", revealAnchor);
  window.addEventListener("beforeprint", preparePrint);
  window.addEventListener("afterprint", restoreAfterPrint);

  setExpanded(false);
  revealAnchor();
}

/**
 * A dica de rolagem aparece apenas quando a tabela realmente não cabe,
 * inclusive com zoom ou fontes ampliadas.
 */
function initScrollableTables(scope) {
  const wraps = Array.from(scope.querySelectorAll(".regulation-table-wrap"));

  const update = () => {
    wraps.forEach((wrap) => {
      const overflows = wrap.scrollWidth > wrap.clientWidth + 1;
      wrap.classList.toggle("is-scrollable", overflows);
    });
  };

  window.addEventListener("resize", update, { passive: true });
  return update;
}
