import assert from "node:assert/strict";
import test from "node:test";
import { createLiveSync } from "../../admin/js/registrations/live-sync.js";
import {
  MAX_BACKOFF_MS,
  SYNC_INTERVAL_MS,
  countNewSince,
  mergeRegistrations,
  nextBackoffDelay,
} from "../../admin/js/registrations/sync-core.js";

function registration(id, createdAt, overrides = {}) {
  return { id, createdAt, updatedAt: createdAt, status: "new", protocol: `MD-${id}`, ...overrides };
}

// Relogio e timers controlados: o teste decide quando cada rodada acontece.
function harness(options = {}) {
  let clock = 0;
  let sequence = 0;
  const pending = new Map();

  const timers = {
    setTimeout: (fn, delay) => {
      sequence += 1;
      pending.set(sequence, { fn, delay });
      return sequence;
    },
    clearTimeout: (handle) => {
      pending.delete(handle);
    },
  };

  let hidden = false;
  let visibilityHandler = null;

  return {
    timers,
    pending,
    now: () => clock,
    advance(ms) {
      clock += ms;
    },
    setHidden(value) {
      hidden = value;
      visibilityHandler?.();
    },
    isHidden: () => hidden,
    addVisibilityListener(handler) {
      visibilityHandler = handler;
      return () => {
        visibilityHandler = null;
      };
    },
    hasVisibilityListener: () => visibilityHandler !== null,
    // Executa o unico timer agendado e devolve o atraso que ele tinha.
    async fire() {
      const entry = [...pending.entries()][0];
      if (!entry) return null;
      const [handle, timer] = entry;
      pending.delete(handle);
      await timer.fn();
      return timer.delay;
    },
    nextDelay() {
      const entry = [...pending.values()][0];
      return entry ? entry.delay : null;
    },
    ...options,
  };
}

function liveSyncWith(harnessRef, options) {
  return createLiveSync({
    timers: harnessRef.timers,
    now: harnessRef.now,
    isHidden: harnessRef.isHidden,
    addVisibilityListener: (handler) => harnessRef.addVisibilityListener(handler),
    ...options,
  });
}

test("merge nao duplica linha e substitui a versao antiga pelo id", () => {
  const current = [registration("b", "2026-09-05T12:00:00.000Z"), registration("a", "2026-09-05T11:00:00.000Z")];
  const incoming = [
    registration("a", "2026-09-05T11:00:00.000Z", { status: "confirmed" }),
    registration("c", "2026-09-05T13:00:00.000Z"),
  ];

  const merged = mergeRegistrations(current, incoming);

  assert.deepEqual(merged.map((item) => item.id), ["c", "b", "a"]);
  assert.equal(merged.filter((item) => item.id === "a").length, 1);
  assert.equal(merged.find((item) => item.id === "a").status, "confirmed");
});

test("merge desempata por id quando o horario e identico", () => {
  const sameMoment = "2026-09-05T12:00:00.000Z";
  const merged = mergeRegistrations(
    [registration("aaa", sameMoment)],
    [registration("ccc", sameMoment), registration("bbb", sameMoment)]
  );
  assert.deepEqual(merged.map((item) => item.id), ["ccc", "bbb", "aaa"]);
});

test("contagem de novidades ignora atualizacao de item ja conhecido", () => {
  const current = [registration("a", "2026-09-05T11:00:00.000Z")];
  const merged = mergeRegistrations(current, [
    registration("a", "2026-09-05T11:00:00.000Z", { status: "confirmed" }),
    registration("b", "2026-09-05T12:00:00.000Z"),
  ]);
  assert.equal(countNewSince(current, merged), 1);
});

test("backoff cresce em potencia de dois ate o teto", () => {
  assert.equal(nextBackoffDelay(0), SYNC_INTERVAL_MS);
  assert.equal(nextBackoffDelay(1, 1000, 60000), 1000);
  assert.equal(nextBackoffDelay(2, 1000, 60000), 2000);
  assert.equal(nextBackoffDelay(4, 1000, 60000), 8000);
  assert.equal(nextBackoffDelay(50, 1000, MAX_BACKOFF_MS), MAX_BACKOFF_MS);
});

test("nunca ha duas requisicoes de sincronizacao ao mesmo tempo", async () => {
  const bench = harness();
  let active = 0;
  let maxActive = 0;
  let release = null;

  const sync = liveSyncWith(bench, {
    intervalMs: 5000,
    reconcileIntervalMs: 60000,
    fetchSync: () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      return new Promise((resolve) => {
        release = () => {
          active -= 1;
          resolve({ ok: true, data: { items: [], syncCursor: "cursor" } });
        };
      });
    },
  });

  sync.start();
  const first = bench.fire();
  // A rodada seguinte e disparada antes de a anterior responder.
  const second = sync.refreshNow();
  release();
  await first;
  await second;

  assert.equal(maxActive, 1);
  sync.stop();
});

test("aba oculta pausa o polling e o retorno de foco sincroniza na hora", async () => {
  const bench = harness();
  const calls = [];
  const sync = liveSyncWith(bench, {
    intervalMs: 5000,
    reconcileIntervalMs: 60000,
    fetchSync: async () => {
      calls.push("sync");
      return { ok: true, data: { items: [], syncCursor: "cursor" } };
    },
  });

  sync.start();
  bench.setHidden(true);
  await bench.fire();
  assert.deepEqual(calls, []);
  assert.equal(sync.getState().paused, true);

  // Voltar ao foco nao espera o proximo intervalo.
  bench.setHidden(false);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(calls, ["sync"]);
  assert.equal(sync.getState().paused, false);
  sync.stop();
});

test("falha aplica backoff e o primeiro sucesso volta ao intervalo normal", async () => {
  const bench = harness();
  let fail = true;
  const sync = liveSyncWith(bench, {
    intervalMs: 1000,
    reconcileIntervalMs: 600000,
    fetchSync: async () => (fail ? { ok: false, error: { code: "offline" } } : { ok: true, data: { items: [] } }),
  });

  sync.start();
  await bench.fire();
  assert.equal(bench.nextDelay(), 1000);
  assert.equal(sync.getState().online, false);

  await bench.fire();
  assert.equal(bench.nextDelay(), 2000);

  fail = false;
  await bench.fire();
  assert.equal(bench.nextDelay(), 1000);
  assert.equal(sync.getState().online, true);
  assert.equal(sync.getState().failures, 0);
  sync.stop();
});

test("reconciliacao completa entra no lugar do incremental apos o intervalo", async () => {
  const bench = harness();
  const calls = [];
  const sync = liveSyncWith(bench, {
    intervalMs: 1000,
    reconcileIntervalMs: 10000,
    fetchSync: async () => {
      calls.push("sync");
      return { ok: true, data: { items: [] } };
    },
    fetchReconcile: async () => {
      calls.push("reconcile");
      return { ok: true, data: { items: [] } };
    },
  });

  sync.start();
  bench.advance(1000);
  await bench.fire();
  assert.deepEqual(calls, ["sync"]);

  bench.advance(10000);
  await bench.fire();
  assert.deepEqual(calls, ["sync", "reconcile"]);

  bench.advance(1000);
  await bench.fire();
  assert.deepEqual(calls, ["sync", "reconcile", "sync"]);
  sync.stop();
});

test("stop encerra timers, listeners e ignora resposta em voo", async () => {
  const bench = harness();
  const batches = [];
  let resolveFetch = null;

  const sync = liveSyncWith(bench, {
    intervalMs: 1000,
    reconcileIntervalMs: 600000,
    fetchSync: () =>
      new Promise((resolve) => {
        resolveFetch = () => resolve({ ok: true, data: { items: [registration("a", "2026-09-05T12:00:00.000Z")] } });
      }),
    onBatch: (result) => batches.push(result),
  });

  sync.start();
  assert.equal(bench.hasVisibilityListener(), true);

  const inFlight = bench.fire();
  sync.stop();
  resolveFetch();
  await inFlight;

  // Resposta que chega depois do unmount nao pode mexer na tela nem reagendar.
  assert.deepEqual(batches, []);
  assert.equal(bench.pending.size, 0);
  assert.equal(bench.hasVisibilityListener(), false);
  assert.equal(sync.getState().running, false);
});
