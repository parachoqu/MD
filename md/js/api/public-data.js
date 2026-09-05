// Carga dos dados publicos. A fonte oficial e sempre a API; os arquivos de
// data/ existem apenas como leitura de emergencia quando o servidor nao responde.
//
// Regra que nao se negocia: dado estatico NUNCA autoriza inscricao. Sem
// confirmacao do servidor o evento sai marcado com registrationLocked, e a
// interface desativa o fluxo de inscricao.

import { apiGet } from "./public-client.js";
import { events as staticEvents } from "../../data/events.js";
import { projects as staticProjects } from "../../data/projects.js";

let bootstrapPromise = null;
let eventsPromise = null;

export function loadPublicBootstrap() {
  if (!bootstrapPromise) bootstrapPromise = fetchBootstrap();
  return bootstrapPromise;
}

export function loadPublicEvents() {
  // Na home o bootstrap ja traz os eventos publicados; reaproveitar evita uma
  // segunda requisicao para a mesma informacao.
  if (bootstrapPromise) return bootstrapPromise;
  if (!eventsPromise) eventsPromise = fetchEvents();
  return eventsPromise;
}

export function resetPublicDataCache() {
  bootstrapPromise = null;
  eventsPromise = null;
}

async function fetchBootstrap() {
  const result = await apiGet("/api/public/bootstrap");
  if (result.ok && result.data && Array.isArray(result.data.events)) {
    return {
      source: "api",
      events: result.data.events,
      projects: Array.isArray(result.data.projects) ? result.data.projects : [],
      bootstrap: result.data,
      error: null,
    };
  }
  return staticFallback(result.error);
}

async function fetchEvents() {
  const result = await apiGet("/api/public/events");
  if (result.ok && Array.isArray(result.data)) {
    return { source: "api", events: result.data, projects: staticProjects, bootstrap: null, error: null };
  }
  return staticFallback(result.error);
}

function staticFallback(error) {
  return {
    source: "static",
    events: staticEvents.map((event) => ({ ...event, registrationLocked: true })),
    projects: staticProjects,
    bootstrap: null,
    error: error || null,
  };
}

// Ponto unico de decisao sobre abrir ou nao o formulario. Qualquer tela que
// mostre o botao de inscricao precisa passar por aqui.
export function canRegister(event, status) {
  return Boolean(status?.canRegister) && event?.registrationLocked !== true;
}

export function findEventBySlug(events, slug) {
  return (events || []).find((event) => event.slug === slug) || null;
}

export function collectSports(events) {
  return Array.from(new Map((events || []).map((event) => [event.sportKey, event.sport])).entries())
    .filter(([value, label]) => value && label)
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}
