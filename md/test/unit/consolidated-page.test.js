import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { canRegister, loadPublicBootstrap, resetPublicDataCache } from "../../js/api/public-data.js";

const ROOT = new URL("../../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, ROOT), "utf8");
}

test("a pagina consolidada preserva shell, catalogo e detalhe dinamico", async () => {
  const html = await source("index.html");
  assert.match(html, /id="mainViews"/);
  assert.match(html, /id="eventDetailSection"[^>]*hidden/);
  assert.match(html, /id="eventDetailRoot"/);
  assert.match(html, /id="inscricoes"/);
  assert.match(html, /id="eventStatus"/);
  assert.match(html, /href="\?evento=taca-vale-handebol-2026"/);
});

test("os HTMLs legados redirecionam para a pagina consolidada", async () => {
  const [eventsRedirect, detailRedirect] = await Promise.all([
    source("inscricoes.html"),
    source("evento.html"),
  ]);
  assert.match(eventsRedirect, /index\.html#inscricoes/);
  assert.match(detailRedirect, /window\.location\.replace\("index\.html" \+ search \+ hash\)/);
  assert.doesNotMatch(eventsRedirect, /id="eventsList"/);
  assert.doesNotMatch(detailRedirect, /id="eventDetailRoot"/);
});

test("o detalhe consolidado usa a API prioritaria e alterna as duas views", async () => {
  const detail = await source("js/events/event-detail.js");
  assert.match(detail, /loadPublicEvents\(\)/);
  assert.match(detail, /getElementById\("mainViews"\)/);
  assert.match(detail, /getElementById\("eventDetailSection"\)/);
  assert.doesNotMatch(detail, /registration-storage\.js/);
});

test("fallback estatico e somente leitura e bloqueia inscricao", async (context) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "fetch");
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    writable: true,
    value: async () => {
      throw new TypeError("offline");
    },
  });
  context.after(() => {
    resetPublicDataCache();
    if (original) Object.defineProperty(globalThis, "fetch", original);
    else delete globalThis.fetch;
  });

  resetPublicDataCache();
  const result = await loadPublicBootstrap();
  assert.equal(result.source, "static");
  assert.ok(result.events.length > 0);
  assert.ok(result.events.every((event) => event.registrationLocked === true));
  assert.ok(result.events.every((event) => canRegister(event, { canRegister: true }) === false));
});
