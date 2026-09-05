import assert from "node:assert/strict";
import test from "node:test";
import { apiGet, apiPost } from "../../js/api/public-client.js";

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
}

function stubFetch(context, handler) {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  context.after(() => {
    globalThis.fetch = original;
  });
}

test("POST envia o contrato esperado pelo servidor", async (context) => {
  const calls = [];
  stubFetch(context, async (path, init) => {
    calls.push({ path, init });
    return jsonResponse({ ok: true, data: { protocol: "MD-20260905-ABCDEFGH" } }, { status: 201 });
  });

  const result = await apiPost("/api/public/registrations", { eventSlug: "evento-teste" }, { idempotencyKey: "chave-de-teste-0001" });

  assert.equal(result.ok, true);
  assert.deepEqual(result.data, { protocol: "MD-20260905-ABCDEFGH" });
  assert.equal(result.status, 201);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/api/public/registrations");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.credentials, "same-origin");
  assert.equal(calls[0].init.headers.get("content-type"), "application/json");
  assert.equal(calls[0].init.headers.get("idempotency-key"), "chave-de-teste-0001");
  assert.equal(calls[0].init.body, JSON.stringify({ eventSlug: "evento-teste" }));
});

test("GET nao envia corpo nem cabecalho de idempotencia", async (context) => {
  let received = null;
  stubFetch(context, async (path, init) => {
    received = init;
    return jsonResponse({ ok: true, data: [] });
  });

  const result = await apiGet("/api/public/events");

  assert.equal(result.ok, true);
  assert.deepEqual(result.data, []);
  assert.equal(received.method, "GET");
  assert.equal(received.body, undefined);
  assert.equal(received.headers.get("content-type"), null);
  assert.equal(received.headers.get("idempotency-key"), null);
});

test("replay de idempotencia e sinalizado pelo header do servidor", async (context) => {
  stubFetch(context, async () =>
    jsonResponse({ ok: true, data: { protocol: "MD-20260905-ABCDEFGH" } }, { headers: { "Idempotency-Replayed": "true" } })
  );

  const result = await apiPost("/api/public/registrations", {}, { idempotencyKey: "chave-de-teste-0002" });
  assert.equal(result.replayed, true);
});

test("422 preserva codigo, mensagem e campos do servidor", async (context) => {
  stubFetch(context, async () =>
    jsonResponse(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Corrija os campos indicados.",
          fields: { "responsible.email": "Informe um e-mail valido." },
        },
      },
      { status: 422 }
    )
  );

  const result = await apiPost("/api/public/registrations", {}, { idempotencyKey: "chave-de-teste-0003" });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "validation_error");
  assert.equal(result.error.status, 422);
  assert.equal(result.error.fields["responsible.email"], "Informe um e-mail valido.");
});

test("429 le o Retry-After para informar a espera", async (context) => {
  stubFetch(context, async () =>
    jsonResponse({ ok: false, error: { code: "RATE_LIMITED", message: "Muitas tentativas." } }, {
      status: 429,
      headers: { "Retry-After": "45" },
    })
  );

  const result = await apiPost("/api/public/contact", {}, { idempotencyKey: "chave-de-teste-0004" });
  assert.equal(result.error.code, "rate_limited");
  assert.equal(result.error.retryAfter, 45);
});

test("resposta sem envelope valido conta como falha, nao como sucesso", async (context) => {
  stubFetch(context, async () => new Response("<html>erro</html>", { status: 502 }));

  const result = await apiGet("/api/public/events");
  assert.equal(result.ok, false);
  assert.equal(result.error.status, 502);
  assert.equal(result.error.code, "http_502");
});

test("falha de rede vira offline sem lancar", async (context) => {
  stubFetch(context, async () => {
    throw new TypeError("Failed to fetch");
  });

  const result = await apiGet("/api/public/bootstrap");
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "offline");
  assert.equal(result.error.status, 0);
});

test("tempo esgotado vira timeout e aborta a requisicao", async (context) => {
  let aborted = false;
  stubFetch(context, (path, init) =>
    new Promise((_, reject) => {
      init.signal.addEventListener("abort", () => {
        aborted = true;
        reject(Object.assign(new Error("abortado"), { name: "AbortError" }));
      });
    })
  );

  const result = await apiGet("/api/public/events", { timeoutMs: 5 });
  assert.equal(result.error.code, "timeout");
  assert.equal(aborted, true);
});

test("cancelamento externo e distinguido de tempo esgotado", async (context) => {
  stubFetch(context, (path, init) =>
    new Promise((_, reject) => {
      init.signal.addEventListener("abort", () => reject(Object.assign(new Error("abortado"), { name: "AbortError" })));
    })
  );

  const controller = new AbortController();
  const pending = apiGet("/api/public/events", { timeoutMs: 5000, signal: controller.signal });
  controller.abort();
  const result = await pending;
  assert.equal(result.error.code, "aborted");
});
