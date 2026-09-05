import assert from "node:assert/strict";
import test from "node:test";

// O modulo le globalThis.localStorage em cada chamada, entao o duble pode ser
// trocado por teste sem precisar reimportar o modulo.
function useStorage(context, seed = {}) {
  const map = new Map(Object.entries(seed));
  const fake = {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { value: fake, configurable: true, writable: true });
  context.after(() => {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete globalThis.localStorage;
  });
  return map;
}

const storageModule = await import("../../js/registration/registration-storage.js");
const {
  DRAFT_TTL_MS,
  clearCompletedRegistration,
  deleteDraft,
  ensureIdempotencyKey,
  getDraft,
  purgeLegacyRegistrations,
  saveDraft,
} = storageModule;

const DRAFTS_KEY = "md.registration.drafts.v1";
const LEGACY_KEY = "md.registrations.v1";
const SERVER_KEY_PATTERN = /^[A-Za-z0-9._:-]{8,200}$/;

test("o modulo nao expoe mais gravacao de inscricao concluida", () => {
  assert.equal(storageModule.saveRegistration, undefined);
  assert.equal(storageModule.getRegistrations, undefined);
  assert.equal(storageModule.getRegistrationsByEvent, undefined);
});

test("rascunho guarda estado, passo e prazo de sete dias", (context) => {
  const map = useStorage(context);
  const before = Date.now();
  saveDraft("evento-teste", { state: { team: { name: "EQUIPE TESTE PREVIEW" } }, step: 2 });

  const draft = getDraft("evento-teste");
  assert.equal(draft.step, 2);
  assert.equal(draft.state.team.name, "EQUIPE TESTE PREVIEW");

  const expiresAt = Date.parse(draft.expiresAt);
  assert.ok(expiresAt >= before + DRAFT_TTL_MS);
  assert.equal(DRAFT_TTL_MS, 7 * 24 * 60 * 60 * 1000);
  assert.ok(map.has(DRAFTS_KEY));
});

test("rascunho vencido e ignorado e apagado do navegador", (context) => {
  const map = useStorage(context);
  saveDraft("evento-teste", { state: {}, step: 0 });

  const stored = JSON.parse(map.get(DRAFTS_KEY));
  stored["evento-teste"].expiresAt = new Date(Date.now() - 1000).toISOString();
  map.set(DRAFTS_KEY, JSON.stringify(stored));

  assert.equal(getDraft("evento-teste"), null);
  assert.deepEqual(JSON.parse(map.get(DRAFTS_KEY)), {});
});

test("a chave de idempotencia e criada uma vez e reaproveitada em cada retry", (context) => {
  useStorage(context);
  saveDraft("evento-teste", { state: {}, step: 0 });

  const first = ensureIdempotencyKey("evento-teste");
  const second = ensureIdempotencyKey("evento-teste");
  const third = ensureIdempotencyKey("evento-teste");

  assert.equal(first, second);
  assert.equal(second, third);
  assert.match(first, SERVER_KEY_PATTERN);
  assert.equal(getDraft("evento-teste").idempotencyKey, first);
});

test("gravar o rascunho de novo nao troca a chave em voo", (context) => {
  useStorage(context);
  const key = ensureIdempotencyKey("evento-teste");
  saveDraft("evento-teste", { state: { team: { name: "OUTRO NOME TESTE" } }, step: 3 });
  assert.equal(getDraft("evento-teste").idempotencyKey, key);
  assert.equal(ensureIdempotencyKey("evento-teste"), key);
});

test("cada evento tem rascunho e chave proprios", (context) => {
  useStorage(context);
  const first = ensureIdempotencyKey("evento-a");
  const second = ensureIdempotencyKey("evento-b");
  assert.notEqual(first, second);

  deleteDraft("evento-a");
  assert.equal(getDraft("evento-a"), null);
  assert.equal(getDraft("evento-b").idempotencyKey, second);
});

test("so o 201 confirmado apaga rascunho e chave", (context) => {
  useStorage(context);
  saveDraft("evento-teste", { state: { team: { name: "EQUIPE TESTE PREVIEW" } }, step: 3 });
  const key = ensureIdempotencyKey("evento-teste");

  // Enquanto nao ha confirmacao, o rascunho e a chave continuam de pe.
  assert.equal(getDraft("evento-teste").idempotencyKey, key);

  clearCompletedRegistration("evento-teste");
  assert.equal(getDraft("evento-teste"), null);
  assert.notEqual(ensureIdempotencyKey("evento-teste"), key);
});

test("a chave antiga de inscricoes concluidas e removida do navegador", (context) => {
  const map = useStorage(context, {
    [LEGACY_KEY]: JSON.stringify([{ protocol: "MD-DEMO-ABC123" }]),
  });

  assert.equal(purgeLegacyRegistrations(), true);
  assert.equal(map.has(LEGACY_KEY), false);
});

test("sem localStorage o fluxo degrada sem lancar", (context) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { value: undefined, configurable: true, writable: true });
  context.after(() => {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete globalThis.localStorage;
  });

  assert.equal(saveDraft("evento-teste", { state: {}, step: 0 }), false);
  assert.equal(getDraft("evento-teste"), null);
  assert.match(ensureIdempotencyKey("evento-teste"), SERVER_KEY_PATTERN);
  assert.equal(purgeLegacyRegistrations(), false);
});
