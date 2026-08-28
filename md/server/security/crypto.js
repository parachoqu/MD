import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function randomToken(size = 32) {
  return randomBytes(size).toString("base64url");
}

export function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

export function hmac(value, secret) {
  if (!secret) throw new Error("Segredo HMAC nao configurado");
  return createHmac("sha256", secret).update(String(value)).digest("hex");
}

export function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function stableJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
    .join(",")}}`;
}

export function payloadHash(value) {
  return sha256(stableJson(value));
}
