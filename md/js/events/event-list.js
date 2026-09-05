import { collectSports, loadPublicEvents } from "../api/public-data.js";
import { createEventRow } from "./event-renderer.js";
import { revealScope } from "../motion.js";

const STATUS_FILTERS = new Set(["open", "soon", "closed"]);

const OFFLINE_NOTICE =
  "Não foi possível confirmar os eventos com o servidor. As informações abaixo podem estar desatualizadas e as inscrições estão indisponíveis no momento.";

export async function initEventList() {
  const grid = document.getElementById("featuredEvents");
  const list = document.getElementById("eventsList");
  if (!grid && !list) return;

  const loading = markLoading(grid, list);
  const result = await loadPublicEvents();
  loading();

  if (grid) renderFeaturedEvents(grid, result);
  if (list) initCatalog(result);
}

// Enquanto a resposta nao chega o usuario precisa ver que algo esta em curso;
// os dois containers ja sao aria-live, entao o texto e anunciado sozinho.
function markLoading(grid, list) {
  const targets = [grid, list].filter(Boolean);
  const placeholders = targets.map((target) => {
    const placeholder = document.createElement("p");
    placeholder.className = "events-notice";
    placeholder.textContent = "Carregando eventos...";
    target.replaceChildren(placeholder);
    return placeholder;
  });
  return () => placeholders.forEach((placeholder) => placeholder.remove());
}

function noticeFor(result) {
  if (result.source === "api") return null;
  const notice = document.createElement("p");
  notice.className = "events-notice events-notice--warning";
  notice.setAttribute("role", "status");
  notice.textContent = OFFLINE_NOTICE;
  return notice;
}

function renderFeaturedEvents(grid, result) {
  const featured = result.events.filter((event) => event.featured).slice(0, 3);
  const rows = featured.length
    ? featured.map((event) => createEventRow(event, "featured"))
    : [emptyMessage("Nenhum evento em destaque no momento.")];

  const notice = noticeFor(result);
  grid.replaceChildren(...(notice ? [notice, ...rows] : rows));
  revealScope(grid);
}

function emptyMessage(text) {
  const paragraph = document.createElement("p");
  paragraph.className = "events-notice";
  paragraph.textContent = text;
  return paragraph;
}

function initCatalog(result) {
  const list = document.getElementById("eventsList");
  const search = document.getElementById("eventSearch");
  const status = document.getElementById("eventStatus");
  const statusWrapper = status?.closest(".events-tools__select--status");
  const sport = document.getElementById("eventSport");
  const clearButtons = Array.from(document.querySelectorAll("[data-clear-event-filters]"));
  const empty = document.getElementById("eventsEmpty");
  const count = document.getElementById("eventsCount");

  if (!list || !search || !status || !sport || !clearButtons.length || !empty) return;
  const form = search.closest("form");
  form?.addEventListener("submit", (event) => event.preventDefault());

  const notice = noticeFor(result);
  if (notice) list.parentElement?.insertBefore(notice, list);

  populateSports(sport, result.events);

  const state = {
    query: "",
    status: "all",
    sport: "all",
  };

  const syncStatusAppearance = () => {
    if (statusWrapper) statusWrapper.dataset.status = state.status;
  };

  const confirmFilterUpdate = () => {
    count?.classList.remove("is-updating");
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => count?.classList.add("is-updating"));
    });
  };

  // A primeira renderização entra com reveal por scroll; as seguintes vêm
  // de uma ação do usuário e precisam aparecer imediatamente.
  let firstRender = true;

  const apply = () => {
    const filtered = filterEvents(result.events, state);
    list.replaceChildren(...filtered.map((event) => createEventRow(event, "list")));
    revealScope(list, { immediate: !firstRender });
    firstRender = false;

    const hasFilters = Boolean(state.query || state.status !== "all" || state.sport !== "all");
    clearButtons.forEach((button) => {
      button.hidden = !hasFilters;
    });
    empty.hidden = filtered.length > 0;
    list.hidden = filtered.length === 0;

    if (count) {
      count.textContent = `${filtered.length} ${filtered.length === 1 ? "evento encontrado" : "eventos encontrados"}`;
    }
    syncStatusAppearance();
    confirmFilterUpdate();
  };

  search.addEventListener("input", () => {
    state.query = normalize(search.value);
    apply();
  });

  status.addEventListener("change", () => {
    state.status = STATUS_FILTERS.has(status.value) ? status.value : "all";
    syncStatusAppearance();
    apply();
  });

  sport.addEventListener("change", () => {
    state.sport = sport.value || "all";
    apply();
  });

  clearButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.query = "";
      state.status = "all";
      state.sport = "all";
      search.value = "";
      status.value = "all";
      sport.value = "all";
      syncStatusAppearance();
      apply();
      search.focus();
    });
  });

  syncStatusAppearance();
  apply();
}

function populateSports(select, events) {
  // Mantem apenas a opcao "todas" ja presente no HTML antes de repovoar.
  Array.from(select.querySelectorAll("option")).slice(1).forEach((option) => option.remove());
  collectSports(events).forEach((option) => {
    const item = document.createElement("option");
    item.value = option.value;
    item.textContent = option.label;
    select.append(item);
  });
}

function filterEvents(events, state) {
  return events
    .filter((event) => {
      const matchesSearch = !state.query || eventSearchText(event).includes(state.query);
      const matchesStatus = state.status === "all" || event.status === state.status;
      const matchesSport = state.sport === "all" || event.sportKey === state.sport;
      return matchesSearch && matchesStatus && matchesSport;
    })
    .sort((a, b) => {
      const aDate = a.date?.sort || "";
      const bDate = b.date?.sort || "";
      return aDate.localeCompare(bDate);
    });
}

function eventSearchText(event) {
  const categoryText = (event.categories || [])
    .flatMap((category) => [category.name, category.division, category.gender])
    .join(" ");

  return normalize(
    [
      event.title,
      event.shortTitle,
      event.sport,
      event.summary,
      categoryText,
      ...(event.keywords || []),
    ].join(" ")
  );
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
