const MIN_SECRET_LENGTH = 32;

function cleanOrigin(value) {
  const raw = String(value || "").trim().replace(/\/$/, "");
  if (!raw) return "";
  const parsed = new URL(raw);
  if (!/^https?:$/.test(parsed.protocol)) throw new Error("APP_ORIGIN deve usar http ou https");
  return parsed.origin;
}

function readSecret(name, required) {
  const value = String(process.env[name] || "");
  if (required && value.length < MIN_SECRET_LENGTH) {
    throw new Error(`${name} deve conter pelo menos ${MIN_SECRET_LENGTH} caracteres`);
  }
  return value;
}

export function getConfig(options = {}) {
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
  const requireSecrets = options.requireSecrets ?? environment !== "test";
  const appOrigin = cleanOrigin(process.env.APP_ORIGIN || "");

  if (requireSecrets && !appOrigin) throw new Error("APP_ORIGIN nao configurada");
  if (options.requireDatabase && !process.env.DATABASE_URL) throw new Error("DATABASE_URL nao configurada");

  return Object.freeze({
    environment,
    production: environment === "production",
    appOrigin,
    databaseUrl: process.env.DATABASE_URL || "",
    blobToken: process.env.BLOB_READ_WRITE_TOKEN || "",
    sessionSecret: readSecret("SESSION_SECRET", requireSecrets),
    csrfSecret: readSecret("CSRF_SECRET", requireSecrets),
    ipHashSecret: readSecret("IP_HASH_SECRET", requireSecrets),
    piiEncryptionKey: process.env.PII_ENCRYPTION_KEY || "",
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA || "local",
  });
}

export const REQUIRED_ENV_KEYS = Object.freeze([
  "DATABASE_URL",
  "BLOB_READ_WRITE_TOKEN",
  "APP_ORIGIN",
  "SESSION_SECRET",
  "CSRF_SECRET",
  "IP_HASH_SECRET",
]);
