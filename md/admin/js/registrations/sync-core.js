// Nucleo puro da atualizacao automatica. Sem window, sem document e sem fetch:
// e exatamente esta parte que os testes exercitam em Node.

export const SYNC_INTERVAL_MS = 5000;
export const RECONCILE_INTERVAL_MS = 60000;
export const MAX_BACKOFF_MS = 60000;

// Mesma ordem da primeira pagina devolvida pelo servidor: created_at DESC, id DESC.
export function compareRegistrations(left, right) {
  const leftDate = String(left?.createdAt || "");
  const rightDate = String(right?.createdAt || "");
  if (leftDate !== rightDate) return leftDate < rightDate ? 1 : -1;
  const leftId = String(left?.id || "");
  const rightId = String(right?.id || "");
  if (leftId === rightId) return 0;
  return leftId < rightId ? 1 : -1;
}

// Merge por ID: a versao que chega substitui a anterior e uma inscricao nunca
// aparece duas vezes, mesmo quando a mesma linha volta em paginas diferentes.
export function mergeRegistrations(current, incoming) {
  const byId = new Map();
  (current || []).forEach((item) => {
    if (item && item.id) byId.set(item.id, item);
  });
  (incoming || []).forEach((item) => {
    if (item && item.id) byId.set(item.id, item);
  });
  return Array.from(byId.values()).sort(compareRegistrations);
}

// Falha seguida espaca a proxima tentativa ate o teto, para nao martelar um
// servidor que ja esta em dificuldade.
export function nextBackoffDelay(failureCount, baseMs = SYNC_INTERVAL_MS, maxMs = MAX_BACKOFF_MS) {
  const count = Number(failureCount);
  if (!Number.isFinite(count) || count <= 0) return baseMs;
  const exponent = Math.min(count - 1, 30);
  return Math.min(baseMs * 2 ** exponent, maxMs);
}

export function countNewSince(previous, merged) {
  const known = new Set((previous || []).map((item) => item?.id));
  return (merged || []).filter((item) => item && !known.has(item.id)).length;
}
