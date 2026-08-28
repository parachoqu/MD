import { ZodError } from "zod";
import { AppError } from "./errors.js";

const BASE_HEADERS = Object.freeze({
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
});

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...BASE_HEADERS, ...headers },
  });
}

export function success(data, status = 200, headers = {}) {
  return json({ ok: true, data }, status, headers);
}

export function failure(error) {
  const status = Number(error?.status || 500);
  const expose = error?.expose ?? status < 500;
  const code = expose ? error?.code || "REQUEST_ERROR" : "INTERNAL_ERROR";
  const message = expose ? error?.message || "Nao foi possivel concluir a operacao." : "Nao foi possivel concluir a operacao.";
  const body = { ok: false, error: { code, message } };
  if (expose && error?.fields) body.error.fields = error.fields;
  return json(body, status, error?.headers || {});
}

export async function readJson(request, options = {}) {
  const maxBytes = options.maxBytes || 256 * 1024;
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > maxBytes) throw new AppError("PAYLOAD_TOO_LARGE", "Corpo da requisicao excede o limite permitido.", 413);
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    throw new AppError("PAYLOAD_TOO_LARGE", "Corpo da requisicao excede o limite permitido.", 413);
  }
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new AppError("INVALID_JSON", "JSON invalido.", 422);
  }
}

export function zodFields(error) {
  const fields = {};
  error.issues.forEach((issue) => {
    const key = issue.path.join(".") || "_form";
    if (!fields[key]) fields[key] = issue.message;
  });
  return fields;
}

export function apiHandler(controller, options = {}) {
  return async function handle(request) {
    try {
      if (options.methods && !options.methods.includes(request.method)) {
        throw new AppError("METHOD_NOT_ALLOWED", "Metodo nao permitido.", 405, {
          headers: { Allow: options.methods.join(", ") },
        });
      }
      return await controller(request);
    } catch (error) {
      if (error instanceof ZodError) {
        return failure(new AppError("VALIDATION_ERROR", "Corrija os campos indicados.", 422, { fields: zodFields(error) }));
      }
      if (error instanceof AppError) return failure(error);
      if (error?.status && error?.code) return failure(new AppError(error.code, error.message, error.status, error));
      console.error("API failure", { name: error?.name || "Error", code: error?.code || "UNEXPECTED" });
      return failure(error);
    }
  };
}
