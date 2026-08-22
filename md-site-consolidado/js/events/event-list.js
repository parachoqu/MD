import { events, getFeaturedEvents, getSports } from "../../data/events.js";
import { createEventRow } from "./event-renderer.js";
import { revealScope } from "../motion.js";

const STATUS_FILTERS = new Set(["open", "soon", "closed"]);

export function initEventList() {
  renderFeaturedEvents();
  initCatalog();
}

function renderFeaturedEvents() {
  const grid = document.getElementById("featuredEvents");
  if (!grid) return;

  const featured = getFeaturedEvents(3);
  grid.replaceChildren(...featured.map((event) => createEventRow(event, "featured")));
  revealScope(grid);
}

function initCatalog() {
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

  populateSports(sport);

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
    const result = filterEvents(state);
    list.replaceChildren(...result.map((event) => createEventRow(event, "list")));
    revealScope(list, { immediate: !firstRender });
    firstRender = false;

    const hasFilters = Boolean(state.query || state.status !== "all" || state.sport !== "all");
    clearButtons.forEach((button) => {
      button.hidden = !hasFilters;
    });
    empty.hidden = result.length > 0;
    list.hidden = result.length === 0;

    if (count) {
      count.textContent = `${result.length} ${result.length === 1 ? "evento encontrado" : "eventos encontrados"}`;
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

function populateSports(select) {
  getSports().forEach((option) => {
    const item = document.createElement("option");
    item.value = option.value;
    item.textContent = option.label;
    select.append(item);
  });
}

function filterEvents(state) {
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
  const categoryText = event.categories
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
