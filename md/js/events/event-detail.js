import { getEventBySlug, getEventStatus } from "../../data/events.js";
import {
  appendDefinition,
  createEventFigure,
  eventCategoriesLabel,
  eventDateMark,
  eventLocationLabel,
  statusBadge,
} from "./event-renderer.js";
import { createRegistrationModal } from "../registration/registration-modal.js";
import { getRegistrationsByEvent } from "../registration/registration-storage.js";
import { revealScope } from "../motion.js";
import { getRegulationRenderer } from "./regulations/index.js";

const CONTACT_URL = "index.html#contato";

export function initEventDetail() {
  const root = document.getElementById("eventDetailRoot");
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("evento");
  const event = slug ? getEventBySlug(slug) : null;

  if (!event) {
    document.body.classList.remove("has-event-mobile-cta");
    renderNotFound(root);
    return;
  }

  updateMeta(event);
  renderEvent(root, event);
}

function renderNotFound(root) {
  document.title = "Evento não encontrado | M&D";
  const wrapper = document.createElement("section");
  wrapper.className = "section internal-state";
  wrapper.append(
    textElement("span", "section-index", "[ 404 ] Eventos"),
    textElement("h1", "section-title", "Evento não encontrado"),
    textElement("p", "section-copy", "Este evento pode ter sido removido ou o endereço está incorreto.")
  );

  const link = document.createElement("a");
  link.className = "btn btn--primary";
  link.href = "inscricoes.html";
  link.textContent = "Ver todos os eventos";
  wrapper.append(link);
  root.replaceChildren(wrapper);
}

function renderEvent(root, event) {
  const status = getEventStatus(event.status);
  document.body.classList.toggle("has-event-mobile-cta", status.canRegister);
  const registrationModal = status.canRegister ? createRegistrationModal(event) : null;
  const registrations = getRegistrationsByEvent(event.slug);

  root.replaceChildren(
    renderBreadcrumb(event),
    renderHero(event, status, registrationModal),
    renderQuickInfo(event),
    renderContent(event, status, registrations, registrationModal)
  );

  revealScope(root);
}

function renderBreadcrumb(event) {
  const nav = document.createElement("nav");
  nav.className = "breadcrumb container";
  nav.setAttribute("aria-label", "Caminho");

  const home = breadcrumbLink("index.html", "Início");
  const events = breadcrumbLink("inscricoes.html", "Inscrições");
  const current = document.createElement("span");
  current.textContent = event.shortTitle || event.title;
  current.setAttribute("aria-current", "page");

  nav.append(home, separator(), events, separator(), current);
  return nav;
}

function renderHero(event, status, registrationModal) {
  const section = document.createElement("section");
  section.className = "event-hero";
  section.setAttribute("aria-labelledby", "eventTitle");

  const inner = document.createElement("div");
  inner.className = "container event-hero__grid";

  const content = document.createElement("div");
  content.className = "event-hero__content";

  const meta = document.createElement("div");
  meta.className = "event-hero__meta";
  meta.dataset.animate = "";
  meta.append(statusBadge(event), textElement("span", "event-sport", event.sport));
  if (event.demo) meta.append(textElement("span", "event-demo-label", "Evento demonstrativo"));

  const title = textElement("h1", "", event.title);
  title.id = "eventTitle";

  const lead = textElement("p", "event-hero__lead", event.summary);
  lead.dataset.animate = "";
  const actions = renderHeroActions(event, status, registrationModal);
  actions.dataset.animate = "";

  content.append(meta, title, lead, actions);

  const visual = createEventFigure(event, "event-hero__visual", { eager: true });
  visual.dataset.animate = "";

  inner.append(content, visual);
  section.append(inner);
  return section;
}

function renderHeroActions(event, status, registrationModal) {
  const actions = document.createElement("div");
  actions.className = "event-hero__actions";
  actions.append(primaryAction(event, status, registrationModal));

  if (!status.canRegister) {
    // Inscrição indisponível: caminho real de contato, sem simular
    // um fluxo aberto e sem prometer aviso automático.
    const contact = document.createElement("a");
    contact.className = "btn btn--light";
    contact.href = CONTACT_URL;
    contact.textContent = "Falar com a M&D";
    actions.append(contact);
  }

  const back = document.createElement("a");
  back.className = "link-action link-action--dark";
  back.href = "inscricoes.html";
  back.textContent = "Ver todos os eventos";
  actions.append(back);

  if (event.status === "cancelled") {
    actions.append(textElement("p", "event-warning", "Este evento foi cancelado pela organização."));
  }

  return actions;
}

/**
 * Ação principal do evento. Aberto abre o fluxo real de inscrição;
 * demais status ficam desabilitados com rótulo textual, borda e cor
 * de estado - nunca apenas cor.
 */
function primaryAction(event, status, registrationModal) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = status.cta;

  if (status.canRegister) {
    button.className = "btn btn--primary";
    button.addEventListener("click", () => registrationModal.open(button));
    return button;
  }

  button.className = event.status === "soon" ? "btn btn--soon" : "btn btn--closed";
  button.disabled = true;
  return button;
}

function renderQuickInfo(event) {
  const section = document.createElement("section");
  section.className = "event-quick";
  const inner = document.createElement("div");
  inner.className = "container";

  const list = document.createElement("dl");
  list.className = "event-quick__grid";

  const dateLabel = event.date?.label || "A confirmar";
  const location = eventLocationLabel(event);
  const registration =
    event.registrationDetails?.feePerTeam ||
    event.registrationPeriod?.label ||
    "A confirmar";
  const regulationRenderer = event.regulation?.available
    ? getRegulationRenderer(event.regulation.id)
    : null;
  const regulation = regulationRenderer
    ? regulationLink("Disponível")
    : "A confirmar";

  appendDefinition(list, "Data", dateLabel, !event.date?.label);
  appendDefinition(list, "Modalidade", event.sport);
  appendDefinition(list, "Categorias", eventCategoriesLabel(event));
  appendDefinition(list, "Local", location, location === "A confirmar");
  appendDefinition(list, "Inscrição", registration, registration === "A confirmar");
  appendDefinition(list, "Regulamento", regulation, !regulationRenderer);
  appendDefinition(list, "Status", getEventStatus(event.status).label);
  appendDefinition(list, "Organização", event.organization || "M&D Projetos e Eventos Desportivos");

  inner.append(list);
  section.append(inner);
  return section;
}

function renderContent(event, status, registrations, registrationModal) {
  const section = document.createElement("section");
  section.className = "section event-content-section";

  const inner = document.createElement("div");
  inner.className = "container event-content-layout";

  const main = document.createElement("div");
  main.className = "event-main-content";
  main.append(
    renderAbout(event),
    renderCategories(event),
    renderSchedule(event),
    renderRegistrationDetails(event),
    renderRegulation(event),
    renderHighlights(event),
    renderSponsors(event),
    renderQuestions(event),
    renderStoredRegistrations(registrations)
  );

  const aside = renderSidebar(event, status, registrationModal);

  inner.append(main, aside);
  section.append(inner);

  if (status.canRegister) {
    section.append(renderMobileBar(event, status, registrationModal));
  }

  return section;
}

function renderAbout(event) {
  return contentBlock("Sobre o evento", [textElement("p", "", event.description)], "evt-sobre");
}

function renderCategories(event) {
  if (!event.categories.length) {
    return contentBlock("Categorias", [textElement("p", "", "Categorias a confirmar.")], "evt-categorias");
  }

  const list = document.createElement("div");
  list.className = "category-list";
  event.categories.forEach((category) => {
    const item = document.createElement("article");
    item.className = "category-item";
    item.append(
      textElement("h3", "", category.name),
      textElement("p", "", [category.division, category.gender].filter(Boolean).join(" · "))
    );
    list.append(item);
  });

  return contentBlock("Categorias", [list], "evt-categorias");
}

function renderSchedule(event) {
  if (!event.schedule.length) {
    return contentBlock("Formato e cronograma", [textElement("p", "", "Cronograma disponível em breve.")], "evt-cronograma");
  }

  const list = document.createElement("dl");
  list.className = "schedule-list";
  event.schedule.forEach((item) => {
    appendDefinition(list, item.label, item.value);
  });
  return contentBlock("Formato e cronograma", [list], "evt-cronograma");
}

function renderRegistrationDetails(event) {
  const details = event.registrationDetails;
  if (!details) return document.createDocumentFragment();

  const list = document.createElement("dl");
  list.className = "schedule-list registration-details";
  appendDefinition(list, "Inscrição", details.feePerTeam);
  appendDefinition(list, "Duas equipes", details.dualInstitutionFee);
  appendDefinition(list, "Capacidade", event.capacity?.label || "A confirmar", !event.capacity?.label);
  appendDefinition(
    list,
    "Composição máxima",
    `${details.maxMembers} integrantes: até ${details.maxAthletes} atletas e ${details.maxStaff} membros da comissão técnica`
  );
  appendDefinition(list, "Por partida", `Até ${details.matchRosterLimit} atletas relacionados`);
  appendDefinition(list, "Período de inscrição", details.period, details.period === "A confirmar");
  return contentBlock("Inscrição e composição das equipes", [list], "evt-inscricao");
}

function renderRegulation(event) {
  if (!event.regulation) return document.createDocumentFragment();

  const renderer = event.regulation.available
    ? getRegulationRenderer(event.regulation.id)
    : null;

  if (!renderer) {
    return contentBlock("Regulamento", [textElement("p", "", "Regulamento disponível em breve.")], "evt-regulamento");
  }

  return renderer(event);
}

function renderHighlights(event) {
  if (!event.highlights?.length) return document.createDocumentFragment();

  const list = document.createElement("div");
  list.className = "highlight-list";
  event.highlights.forEach((highlight) => {
    const item = document.createElement("article");
    item.className = "highlight-item";
    item.append(
      textElement("h3", "", highlight.title),
      textElement("p", "", highlight.detail)
    );
    list.append(item);
  });

  return contentBlock("Premiações e destaques confirmados", [list], "evt-premiacoes");
}

function renderSponsors(event) {
  if (!event.sponsors.length) {
    return contentBlock("Patrocinadores", [textElement("p", "", "Patrocinadores a confirmar.")], "evt-patrocinadores");
  }

  const list = document.createElement("div");
  list.className = "sponsor-list";
  event.sponsors.forEach((sponsor) => {
    const item = document.createElement("article");
    item.className = "sponsor-item";
    const logo = document.createElement("div");
    logo.className = "sponsor-placeholder";
    logo.textContent = sponsor.logo ? "" : "Logo oficial pendente";
    item.append(logo, textElement("h3", "", sponsor.name), textElement("p", "", sponsor.note || ""));
    list.append(item);
  });

  return contentBlock("Patrocinadores", [list], "evt-patrocinadores");
}

function renderQuestions(event) {
  const text = event.demo
    ? "Este evento existe apenas para teste do fluxo de inscrição. Em produção, dúvidas devem usar os canais oficiais da M&D."
    : "Dúvidas sobre o período de inscrição, horários e demais informações operacionais devem ser encaminhadas pelos canais oficiais da M&D.";

  const link = document.createElement("a");
  link.className = "link-action";
  link.href = CONTACT_URL;
  link.textContent = "Falar com a M&D";

  return contentBlock("Dúvidas", [textElement("p", "", text), link], "evt-duvidas");
}

function renderStoredRegistrations(registrations) {
  if (!registrations.length) return document.createDocumentFragment();

  const list = document.createElement("ul");
  list.className = "stored-registrations";
  registrations.slice(0, 4).forEach((registration) => {
    const item = document.createElement("li");
    item.append(
      textElement("strong", "", registration.team?.name || "Equipe"),
      textElement("span", "", registration.protocol)
    );
    list.append(item);
  });

  return contentBlock(
    "Inscrições demonstrativas salvas",
    [textElement("p", "", "Registros locais encontrados neste navegador."), list],
    "evt-inscricoes-salvas"
  );
}

function renderSidebar(event, status, registrationModal) {
  const aside = document.createElement("aside");
  aside.className = "event-sidebar";
  aside.append(
    textElement("span", "event-sidebar__label", eventDateMark(event)),
    textElement("strong", "event-sidebar__date", event.shortTitle || event.title),
    textElement("p", "", eventCategoriesLabel(event)),
    statusBadge(event),
    primaryAction(event, status, registrationModal)
  );

  if (!status.canRegister) {
    const note = document.createElement("p");
    note.className = "event-sidebar__note";
    note.textContent =
      event.status === "soon"
        ? "Data, local e regulamento estão confirmados. Período de inscrição e horários permanecem a confirmar."
        : "Este evento não recebe novas inscrições.";
    aside.append(note);

    const contact = document.createElement("a");
    contact.className = "link-action";
    contact.href = CONTACT_URL;
    contact.textContent = "Falar com a M&D";
    aside.append(contact);
  }

  return aside;
}

function renderMobileBar(event, status, registrationModal) {
  const bar = document.createElement("div");
  bar.className = "event-mobile-cta";
  const label = document.createElement("span");
  label.textContent = event.shortTitle || event.title;
  const button = document.createElement("button");
  button.className = "btn btn--primary";
  button.type = "button";
  button.textContent = status.cta;
  button.addEventListener("click", () => registrationModal.open(button));
  bar.append(label, button);
  return bar;
}

/**
 * O `id` é âncora estável das seções do evento. Ele não altera
 * layout nem comportamento; serve à navegação local do mobile e a
 * links diretos como #regulamento.
 */
function contentBlock(title, children, id) {
  const block = document.createElement("section");
  block.className = "event-content-block";
  if (id) block.id = id;
  children.forEach((child) => {
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    if (child.matches("h1, h2, h3") || child.querySelector("h1, h2, h3")) return;
    child.dataset.animate = "";
  });
  block.append(textElement("h2", "", title), ...children);
  return block;
}

function breadcrumbLink(href, label) {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = label;
  return link;
}

function regulationLink(label) {
  const link = document.createElement("a");
  link.href = "#regulamento";
  link.textContent = label;
  return link;
}

function separator() {
  const item = document.createElement("span");
  item.textContent = "/";
  item.setAttribute("aria-hidden", "true");
  return item;
}

function textElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
}

function updateMeta(event) {
  document.title = `${event.title} | M&D`;
  const description = document.querySelector("meta[name='description']");
  if (description) description.setAttribute("content", event.summary);
}
