import { AppError, notFoundError } from "./errors.js";

export function pathSegments(request, prefix) {
  const url = new URL(request.url);
  const rewrittenPath = url.searchParams.get("__md_route");
  if (rewrittenPath !== null) {
    return rewrittenPath
      .split("/")
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment));
  }
  const pathname = url.pathname;
  if (!pathname.startsWith(prefix)) throw notFoundError();
  return pathname
    .slice(prefix.length)
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));
}

export function requireMethod(request, ...methods) {
  if (!methods.includes(request.method)) {
    throw new AppError("METHOD_NOT_ALLOWED", "Metodo nao permitido.", 405, {
      headers: { Allow: methods.join(", ") },
    });
  }
}

export function dataFromBody(body) {
  return body && typeof body.data === "object" && body.data !== null ? body.data : body;
}

export function expectedRevision(body, fallback = null) {
  const value = body?.revision ?? fallback;
  const revision = Number(value);
  if (!Number.isInteger(revision) || revision <= 0) {
    throw new AppError("VALIDATION_ERROR", "Revisao obrigatoria.", 422, {
      fields: { revision: "Informe a revisao carregada antes de salvar." },
    });
  }
  return revision;
}
