let csrfToken = "";
const pendingMutations = new Map();

function normalizeError(error, status) {
  const fields = error?.fields && typeof error.fields === "object" ? error.fields : {};
  const errors = Object.entries(fields)
    .filter(([, message]) => typeof message === "string")
    .map(([field, message]) => ({ field, message }));
  return {
    code: String(error?.code || `http_${status}`).toLowerCase(),
    message: error?.message || "Nao foi possivel concluir a operacao.",
    field: errors[0]?.field || null,
    ...(errors.length ? { errors } : {}),
    ...(Array.isArray(fields.usage) ? { usage: fields.usage } : {}),
    status,
  };
}

function networkFailure(error) {
  const timedOut = error?.name === "AbortError";
  return {
    ok: false,
    error: {
      code: timedOut ? "timeout" : "offline",
      message: timedOut
        ? "A operacao demorou mais que o esperado. Tente novamente."
        : "Sem conexao com o backend. Verifique sua rede e tente novamente.",
      status: 0,
    },
  };
}

export function setSessionState(session) {
  csrfToken = session?.csrfToken || "";
}

export function getCsrfToken() {
  return csrfToken;
}

export async function apiRequest(path, options = {}) {
  const method = options.method || "GET";
  const mutation = !["GET", "HEAD"].includes(method);
  const payload = options.body === undefined ? undefined : JSON.stringify(options.body);
  const mutationKey = options.dedupeKey || (mutation ? `${method}:${path}:${payload || ""}` : null);
  if (mutationKey && pendingMutations.has(mutationKey)) return pendingMutations.get(mutationKey);

  const operation = (async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs || 15_000);
    const headers = new Headers({ Accept: "application/json", ...(options.headers || {}) });
    if (payload !== undefined) headers.set("Content-Type", "application/json");
    if (mutation && options.csrf !== false && csrfToken) headers.set("X-CSRF-Token", csrfToken);
    try {
      const response = await fetch(path, {
        method,
        headers,
        body: payload,
        credentials: "same-origin",
        signal: controller.signal,
      });
      let body;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      if (response.status === 401) {
        csrfToken = "";
        window.dispatchEvent(new CustomEvent("md:session-expired"));
      }
      if (!response.ok || !body?.ok) {
        return { ok: false, error: normalizeError(body?.error, response.status) };
      }
      return body;
    } catch (error) {
      return networkFailure(error);
    } finally {
      window.clearTimeout(timeout);
    }
  })();

  if (mutationKey) pendingMutations.set(mutationKey, operation);
  try {
    return await operation;
  } finally {
    if (mutationKey) pendingMutations.delete(mutationKey);
  }
}

export function queryString(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}
