import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const PARAMETERS = Object.freeze({ N: 16384, r: 8, p: 1, keyLength: 64 });
const PREFIX = "scrypt";

export function validatePasswordStrength(password) {
  const value = String(password || "");
  const errors = [];
  if (value.length < 12) errors.push("Use pelo menos 12 caracteres.");
  if (value.length > 256) errors.push("A senha excede o limite permitido.");
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(value)).length;
  if (classes < 3) errors.push("Combine ao menos tres grupos: minusculas, maiusculas, numeros e simbolos.");
  return errors;
}

export async function hashPassword(password) {
  const errors = validatePasswordStrength(password);
  if (errors.length) throw new Error(errors.join(" "));
  const salt = randomBytes(16);
  const derived = await scrypt(String(password), salt, PARAMETERS.keyLength, {
    N: PARAMETERS.N,
    r: PARAMETERS.r,
    p: PARAMETERS.p,
    maxmem: 64 * 1024 * 1024,
  });
  return [
    PREFIX,
    PARAMETERS.N,
    PARAMETERS.r,
    PARAMETERS.p,
    salt.toString("base64url"),
    Buffer.from(derived).toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password, encoded) {
  try {
    const [prefix, rawN, rawR, rawP, saltValue, hashValue] = String(encoded || "").split("$");
    const N = Number(rawN);
    const r = Number(rawR);
    const p = Number(rawP);
    if (prefix !== PREFIX || N !== PARAMETERS.N || r !== PARAMETERS.r || p !== PARAMETERS.p) return false;
    const salt = Buffer.from(saltValue, "base64url");
    const expected = Buffer.from(hashValue, "base64url");
    if (salt.length !== 16 || expected.length !== PARAMETERS.keyLength) return false;
    const derived = await scrypt(String(password || ""), salt, expected.length, {
      N,
      r,
      p,
      maxmem: 64 * 1024 * 1024,
    });
    return timingSafeEqual(Buffer.from(derived), expected);
  } catch {
    return false;
  }
}
