// Log de atividade append-only. Outros repositorios chamam record() apos toda
// mutacao (create/update/duplicate/archive/delete/publish/upload) para que o
// Dashboard mostre "ultimas alteracoes locais" reais, sem views tocando storage.

import { localStore, withLatency } from "../storage-adapter.js";
import { STORAGE_KEYS } from "../data/admin-seed.js";
import { generateId } from "../utils.js";
import { ok } from "../result.js";

const MAX_ENTRIES = 200;

function readAll() {
  return localStore.read(STORAGE_KEYS.activity, []);
}

// Sincrono e sem latencia simulada de proposito: chamado internamente por outros
// repositorios dentro do mesmo ciclo de escrita, nunca diretamente por uma view.
export function record(entry) {
  const list = readAll();
  list.unshift({
    id: generateId("act"),
    at: new Date().toISOString(),
    domain: entry.domain,
    action: entry.action,
    label: entry.label,
  });
  localStore.write(STORAGE_KEYS.activity, list.slice(0, MAX_ENTRIES));
}

export const activityRepository = {
  async list(limit) {
    return withLatency(() => ok(readAll().slice(0, limit || 20)));
  },
};
