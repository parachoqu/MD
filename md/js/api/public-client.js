// Cliente HTTP do site publico. Inscricao, contato e leitura de conteudo passam
// por aqui para que timeout, cancelamento e formato de erro sejam identicos em
// todos os fluxos -- a interface nunca precisa adivinhar o que deu errado.
//
// Nenhuma funcao lanca: o resultado e sempre { ok: true, ... } ou { ok: false, error }.

export const PUBLIC_API_TIMEOUT_MS = 15000;

const GENERIC_MESSAGE = "Não foi possível concluir a operação.";

export async function apiGet(path, options = {}) {
  return request("GET", path, undefined, options);
}

export async function apiPost(path, body, options = {}) {
  return request("POST", path, body, options);
}

async function request(method, path, body, options = {}) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs || PUBLIC_API_TIMEOUT_MS);

  const external = options.signal || null;
  const forwardAbort = () => controller.abort();
  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener("abort", forwardAbort, { once: true });
  }

  const headers = new Headers({ Accept: "application/json" });
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (options.idempotencyKey) headers.set("Idempotency-Key", options.idempotencyKey);

  try {
    const response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      signal: controller.signal,
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok || !payload || payload.ok !== true) {
      return { ok: false, error: httpError(payload, response.status, response.headers) };
    }

    return {
      ok: true,
      data: payload.data,
      status: response.status,
      // O servidor marca replay de idempotencia por header; quem envia precisa
      // saber que a resposta veio da gravacao anterior, nao de uma nova.
      replayed: response.headers.get("idempotency-replayed") === "true",
    };
  } catch (error) {
    return { ok: false, error: transportError(error, timedOut) };
  } finally {
    clearTimeout(timer);
    external?.removeEventListener?.("abort", forwardAbort);
  }
}

function httpError(payload, status, headers) {
  const error = payload && typeof payload === "object" ? payload.error : null;
  const fields = error?.fields && typeof error.fields === "object" ? error.fields : {};
  const header = Number(headers?.get?.("retry-after"));

  return {
    code: String(error?.code || `http_${status}`).toLowerCase(),
    message: error?.message || GENERIC_MESSAGE,
    status,
    fields,
    retryAfter: Number.isFinite(header) && header > 0 ? header : null,
  };
}

// Falha antes de existir resposta: distingue tempo esgotado, cancelamento pedido
// por quem chamou e ausencia de rede, porque cada um pede uma reacao diferente.
function transportError(error, timedOut) {
  if (timedOut) {
    return {
      code: "timeout",
      message: "A operação demorou mais que o esperado. Tente novamente.",
      status: 0,
      fields: {},
      retryAfter: null,
    };
  }

  if (error?.name === "AbortError") {
    return { code: "aborted", message: "Operação cancelada.", status: 0, fields: {}, retryAfter: null };
  }

  return {
    code: "offline",
    message: "Sem conexão com o servidor. Verifique sua rede e tente novamente.",
    status: 0,
    fields: {},
    retryAfter: null,
  };
}
