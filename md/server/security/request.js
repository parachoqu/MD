import { hmac, safeEqual } from "./crypto.js";

export function getClientAddress(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",", 1)[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export function getIpHash(request, secret) {
  return hmac(`ip:${getClientAddress(request)}`, secret);
}

export function getUserAgentHash(request, secret) {
  return hmac(`ua:${request.headers.get("user-agent") || "unknown"}`, secret);
}

export function parseCookies(request) {
  const result = {};
  const raw = request.headers.get("cookie") || "";
  raw.split(";").forEach((part) => {
    const index = part.indexOf("=");
    if (index < 0) return;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!key) return;
    try {
      result[key] = decodeURIComponent(value);
    } catch {
      result[key] = value;
    }
  });
  return result;
}

export function assertSameOrigin(request, expectedOrigin) {
  const origin = request.headers.get("origin");
  if (!origin || !expectedOrigin || !safeEqual(origin.replace(/\/$/, ""), expectedOrigin)) {
    const error = new Error("Origem da requisicao nao autorizada");
    error.code = "FORBIDDEN";
    error.status = 403;
    throw error;
  }
}
