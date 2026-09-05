// Rascunho local vale 7 dias a partir da ultima gravacao: prazo suficiente para
// retomar a inscricao sem deixar dado pessoal parado no navegador.
export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const DRAFTS_KEY = "md.registration.drafts.v1";
const LEGACY_REGISTRATIONS_KEY = "md.registrations.v1";
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,200}$/;

export function getDraft(eventSlug) {
  const drafts = getDrafts();
  const draft = drafts[eventSlug];
  if (!draft) return null;

  if (isExpired(draft)) {
    deleteDraft(eventSlug);
    return null;
  }

  return draft;
}

export function saveDraft(eventSlug, draft) {
  const drafts = getDrafts();
  const previous = drafts[eventSlug] || {};
  const now = Date.now();

  drafts[eventSlug] = {
    ...previous,
    ...draft,
    // A chave sobrevive a cada gravacao: e ela que impede inscricao duplicada
    // quando o mesmo envio precisa ser repetido.
    idempotencyKey: draft?.idempotencyKey || previous.idempotencyKey || null,
    updatedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + DRAFT_TTL_MS).toISOString(),
  };

  return write(DRAFTS_KEY, drafts);
}

export function deleteDraft(eventSlug) {
  const drafts = getDrafts();
  delete drafts[eventSlug];
  return write(DRAFTS_KEY, drafts);
}

// Reaproveita a chave ja persistida para que uma nova tentativa do mesmo envio
// continue sendo a mesma inscricao aos olhos do servidor.
export function ensureIdempotencyKey(eventSlug) {
  const draft = getDraft(eventSlug);
  if (draft?.idempotencyKey && IDEMPOTENCY_PATTERN.test(draft.idempotencyKey)) {
    return draft.idempotencyKey;
  }

  const key = createIdempotencyKey();
  saveDraft(eventSlug, { ...(draft || {}), idempotencyKey: key });
  return key;
}

// Apaga rascunho e chave. So pode ser chamada apos o 201 confirmado pelo servidor.
export function clearCompletedRegistration(eventSlug) {
  return deleteDraft(eventSlug);
}

// A versao antiga guardava inscricoes "concluidas" no navegador; nada disso e
// oficial, entao a chave e removida na primeira abertura do modal.
export function purgeLegacyRegistrations() {
  const store = storage();
  if (!store) return false;

  try {
    store.removeItem(LEGACY_REGISTRATIONS_KEY);
    return true;
  } catch (error) {
    return false;
  }
}

// localStorage pode nao existir (Node, modo privado, cookies bloqueados).
function storage() {
  try {
    return globalThis.localStorage || null;
  } catch (error) {
    return null;
  }
}

function isExpired(draft) {
  const limit = Date.parse(draft?.expiresAt || "");
  if (Number.isFinite(limit)) return Date.now() > limit;

  // Rascunho gravado antes da expiracao existir: conta o prazo pela ultima escrita.
  const updated = Date.parse(draft?.updatedAt || "");
  return Number.isFinite(updated) ? Date.now() > updated + DRAFT_TTL_MS : false;
}

function createIdempotencyKey() {
  const source = globalThis.crypto;
  if (typeof source?.randomUUID === "function") return source.randomUUID();

  if (typeof source?.getRandomValues === "function") {
    const bytes = source.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  return `md-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function read(key, fallback) {
  const store = storage();
  if (!store) return fallback;

  try {
    const raw = store.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch (error) {
    return fallback;
  }
}

function getDrafts() {
  const drafts = read(DRAFTS_KEY, {});
  return drafts && typeof drafts === "object" && !Array.isArray(drafts) ? drafts : {};
}

function write(key, value) {
  const store = storage();
  if (!store) return false;

  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}
