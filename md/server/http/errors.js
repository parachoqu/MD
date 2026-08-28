export class AppError extends Error {
  constructor(code, message, status = 500, options = {}) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.fields = options.fields || undefined;
    this.headers = options.headers || undefined;
    this.expose = options.expose ?? status < 500;
  }
}

export function validationError(fields, message = "Corrija os campos indicados.") {
  return new AppError("VALIDATION_ERROR", message, 422, { fields });
}

export function conflictError(message = "O recurso foi alterado por outra sessao.") {
  return new AppError("REVISION_CONFLICT", message, 409);
}

export function notFoundError(message = "Recurso nao encontrado.") {
  return new AppError("NOT_FOUND", message, 404);
}

export function unauthorizedError() {
  return new AppError("UNAUTHORIZED", "Sessao ausente ou expirada.", 401);
}

export function forbiddenError(message = "Operacao nao autorizada.") {
  return new AppError("FORBIDDEN", message, 403);
}

export function rateLimitError(retryAfter) {
  return new AppError("RATE_LIMITED", "Muitas tentativas. Aguarde antes de tentar novamente.", 429, {
    headers: { "Retry-After": String(retryAfter) },
  });
}
