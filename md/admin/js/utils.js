// Funcoes puras reutilizadas pelos repositorios, views e componentes do painel admin.
// Nenhuma funcao aqui toca storage ou DOM.

export function generateId(prefix) {
  const random =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 10)
      : Math.random().toString(16).slice(2, 12);
  return prefix + "-" + random;
}

export function clone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function slugify(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidSlug(slug) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(String(slug || ""));
}

export function isNonNegativeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

// Protocolos aceitos para URLs digitadas no admin (links de CTA, patrocinador, redes sociais etc.).
// http: so e aceito porque o proprio painel roda em desenvolvimento local sem HTTPS.
const SAFE_PROTOCOLS = new Set(["https:", "http:", "mailto:", "tel:"]);

export function isSafeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return false;
  const lower = raw.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
    return false;
  }
  if (raw.startsWith("/") || raw.startsWith("#") || raw.startsWith("./") || raw.startsWith("../")) {
    return !raw.startsWith("//");
  }
  try {
    const url = new URL(raw);
    return SAFE_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

export function formatDateBR(isoDate) {
  if (!isoDate) return "A confirmar";
  const parts = String(isoDate).split("-");
  if (parts.length !== 3) return isoDate;
  const [year, month, day] = parts;
  return day + "/" + month + "/" + year;
}

export function formatDateTimeBR(isoString) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function debounce(fn, delayMs) {
  let timer = null;
  return function debounced(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

const FILENAME_ALLOWLIST = /[^A-Za-z0-9À-ſ .,_-]/g;

// Rotulo seguro para exibir nomes de arquivo enviados pelo usuario: mantem so
// caracteres previsiveis, nunca deixa o nome original ir direto para textContent
// sem passar por aqui (evita nomes de arquivo enganosos ou puramente visuais).
export function sanitizeLabel(text, maxLength = 80) {
  const cleaned = String(text || "").replace(FILENAME_ALLOWLIST, "").trim();
  const safe = cleaned.length ? cleaned : "arquivo-sem-nome";
  return safe.slice(0, maxLength);
}

export function getPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc === null || acc === undefined ? acc : acc[key]), obj);
}

export function setPath(obj, path, value) {
  const keys = path.split(".");
  let target = obj;
  for (let i = 0; i < keys.length - 1; i += 1) {
    if (target[keys[i]] === null || target[keys[i]] === undefined || typeof target[keys[i]] !== "object") {
      target[keys[i]] = {};
    }
    target = target[keys[i]];
  }
  target[keys[keys.length - 1]] = value;
}

export function bytesToReadable(bytes) {
  if (!Number.isFinite(bytes)) return "-";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
