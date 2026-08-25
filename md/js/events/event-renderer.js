import { getEventStatus } from "../../data/events.js";

const MONTH_ABBR = {
  janeiro: "JAN",
  fevereiro: "FEV",
  "março": "MAR",
  marco: "MAR",
  abril: "ABR",
  maio: "MAI",
  junho: "JUN",
  julho: "JUL",
  agosto: "AGO",
  setembro: "SET",
  outubro: "OUT",
  novembro: "NOV",
  dezembro: "DEZ",
};

export function eventUrl(event) {
  return `evento.html?evento=${encodeURIComponent(event.slug)}`;
}

export function statusBadge(event) {
  const status = getEventStatus(event.status);
  const badge = document.createElement("span");
  badge.className = `event-status event-status--${status.tone}`;
  badge.textContent = status.label;
  return badge;
}

export function eventCategoriesLabel(event) {
  const divisions = unique(event.categories.map((category) => category.division).filter(Boolean));
  const genders = unique(event.categories.map((category) => category.gender).filter(Boolean));
  return [divisions.join(" / "), genders.join(" / ")].filter(Boolean).join(" · ") || "Categoria a confirmar";
}

export function eventLocationLabel(event) {
  const location = event.location || {};
  const place = [location.venue, location.city, location.state].filter(Boolean).join(" · ");
  return place || "A confirmar";
}

/**
 * Marcador de tempo em mono. Deriva "MÊS / ANO" apenas do label já existente
 * em data/events.js. Nenhuma data é inferida ou inventada: sem padrão
 * reconhecível, o próprio label é exibido.
 */
export function eventDateMark(event) {
  const label = event.date?.label;
  if (!label) return "A CONFIRMAR";

  const match = String(label)
    .toLowerCase()
    .match(/([a-zç]+)\s+de\s+(\d{4})/i);

  if (match && MONTH_ABBR[match[1]]) {
    return `${MONTH_ABBR[match[1]]} / ${match[2]}`;
  }

  return String(label).toUpperCase();
}

/**
 * Imagem do evento dentro da moldura estrutural e uma única faixa cinética
 * diagonal. A condição demonstrativa permanece nos rótulos funcionais.
 */
export function createEventFigure(event, className = "event-hero__visual", { eager = false } = {}) {
  const figure = document.createElement("figure");
  figure.className = `${className} media-frame`;

  const image = document.createElement("img");
  image.src = event.visual?.image || "";
  image.alt = event.visual?.imageAlt || `Imagem demonstrativa do evento ${event.title}`;
  image.width = 1536;
  image.height = 1024;
  if (!eager) image.loading = "lazy";

  const line = document.createElement("span");
  line.className = "kinetic-line";
  line.setAttribute("aria-hidden", "true");

  figure.append(image, line);
  return figure;
}

/**
 * Linha editorial de evento: data em mono, modalidade, título, status,
 * condição demonstrativa e seta de ação. Substitui o card flutuante.
 */
export function createEventRow(event, variant = "list") {
  const row = document.createElement("a");
  row.className = `event-row event-row--${variant}`;
  row.href = eventUrl(event);
  row.dataset.eventSlug = event.slug;

  const date = document.createElement("span");
  date.className = "event-row__date";
  date.textContent = eventDateMark(event);
  date.dataset.animate = "";

  const body = document.createElement("div");
  body.className = "event-row__body";

  const sport = document.createElement("span");
  sport.className = "event-row__sport";
  sport.textContent = event.sport;
  sport.dataset.animate = "";

  const title = document.createElement("h3");
  title.className = "event-row__title";
  title.textContent = event.title;

  body.append(sport, title);

  if (event.summary) {
    const summary = document.createElement("p");
    summary.className = "event-row__summary";
    summary.textContent = event.summary;
    summary.dataset.animate = "";
    body.append(summary);
  }

  const tags = document.createElement("div");
  tags.className = "event-row__tags";
  tags.dataset.animate = "";
  tags.append(statusBadge(event));

  if (event.demo) {
    const demo = document.createElement("span");
    demo.className = "event-demo-label";
    demo.textContent = "Demonstrativo";
    tags.append(demo);
  }

  const arrow = document.createElement("span");
  arrow.className = "event-row__arrow";
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "→";
  arrow.dataset.animate = "";

  row.append(date, body, tags, arrow);
  return row;
}

export function appendDefinition(parent, label, value, pending = false, field = "") {
  if (!value) return;
  const item = document.createElement("div");
  item.className = pending ? "event-definition event-definition--pending" : "event-definition";
  if (field) item.dataset.eventField = field;

  const term = document.createElement("dt");
  term.textContent = label;

  const description = document.createElement("dd");
  if (value?.nodeType === 1) {
    description.append(value);
  } else {
    description.textContent = value;
  }

  item.append(term, description);
  parent.append(item);
}

function unique(values) {
  return Array.from(new Set(values));
}
