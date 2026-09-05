// Motor da atualizacao automatica das inscricoes. Polling puro com cursor
// incremental -- sem WebSocket, sem SSE e sem servico externo.
//
// Toda dependencia de ambiente (timers, visibilidade da aba, relogio) entra por
// injecao para que o comportamento possa ser testado em Node, sem DOM.

import { RECONCILE_INTERVAL_MS, SYNC_INTERVAL_MS, nextBackoffDelay } from "./sync-core.js";

function browserTimers() {
  return {
    setTimeout: (fn, delay) => setTimeout(fn, delay),
    clearTimeout: (handle) => clearTimeout(handle),
  };
}

function browserVisibility(onChange) {
  if (typeof document === "undefined") return () => {};
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

export function createLiveSync(options = {}) {
  const timers = options.timers || browserTimers();
  const now = options.now || (() => Date.now());
  const intervalMs = options.intervalMs || SYNC_INTERVAL_MS;
  const reconcileIntervalMs = options.reconcileIntervalMs || RECONCILE_INTERVAL_MS;
  const isHidden = options.isHidden || (() => typeof document !== "undefined" && document.hidden === true);
  const addVisibilityListener = options.addVisibilityListener || browserVisibility;

  let timer = null;
  let running = false;
  let inFlight = false;
  let failures = 0;
  let lastReconcileAt = 0;
  let removeVisibility = null;

  const state = { running: false, paused: false, online: true, failures: 0, lastSyncAt: null };

  function emit(patch) {
    Object.assign(state, patch);
    options.onState?.({ ...state });
  }

  function schedule(delay) {
    timers.clearTimeout(timer);
    timer = null;
    if (!running) return;
    timer = timers.setTimeout(tick, delay);
  }

  async function tick() {
    if (!running) return;

    // Nunca ha duas requisicoes vivas: a rodada seguinte espera a atual terminar.
    if (inFlight) {
      schedule(intervalMs);
      return;
    }

    // Aba em segundo plano nao consome cota nem bateria; o retorno de foco
    // dispara uma sincronizacao imediata.
    if (isHidden()) {
      emit({ paused: true });
      schedule(intervalMs);
      return;
    }

    if (state.paused) emit({ paused: false });

    inFlight = true;
    // A reconciliacao completa recupera qualquer atualizacao que o cursor
    // incremental possa ter perdido por concorrencia no servidor.
    const reconcile = now() - lastReconcileAt >= reconcileIntervalMs;

    try {
      const result = reconcile ? await options.fetchReconcile?.() : await options.fetchSync?.();
      if (!running) return;

      if (result && result.ok) {
        if (reconcile) lastReconcileAt = now();
        failures = 0;
        emit({ online: true, failures: 0, lastSyncAt: now() });
        options.onBatch?.(result, { reconcile });
        schedule(intervalMs);
        return;
      }

      failures += 1;
      emit({ online: false, failures });
      options.onError?.(result?.error || null);
      schedule(nextBackoffDelay(failures, intervalMs));
    } catch (error) {
      if (!running) return;
      failures += 1;
      emit({ online: false, failures });
      options.onError?.(error);
      schedule(nextBackoffDelay(failures, intervalMs));
    } finally {
      inFlight = false;
    }
  }

  function refreshNow() {
    if (!running) return;
    timers.clearTimeout(timer);
    timer = null;
    return tick();
  }

  function start() {
    if (running) return;
    running = true;
    lastReconcileAt = now();
    removeVisibility = addVisibilityListener(() => {
      if (running && !isHidden()) refreshNow();
    });
    emit({ running: true });
    schedule(intervalMs);
  }

  // Chamado pelo unmount da view: nenhum timer, listener ou resposta pendente
  // pode sobreviver a troca de rota.
  function stop() {
    running = false;
    timers.clearTimeout(timer);
    timer = null;
    removeVisibility?.();
    removeVisibility = null;
    emit({ running: false, paused: false });
  }

  return { start, stop, refreshNow, getState: () => ({ ...state }) };
}
