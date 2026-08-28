import { z } from "zod";

const HTML_TAG = /<\/?[a-z][^>]*>/i;
const UNSAFE_SCHEME = /^\s*(?:javascript|data|vbscript):/i;

export function plainText(max = 500, options = {}) {
  let schema = z.string().trim().max(max, `Use no maximo ${max} caracteres.`).refine((value) => !HTML_TAG.test(value), "HTML nao e permitido.");
  if (options.min) schema = schema.min(options.min, `Use pelo menos ${options.min} caracteres.`);
  return schema;
}

export const optionalText = (max = 500) => plainText(max).optional().or(z.literal(""));
export const nullableText = (max = 500) => plainText(max).nullable().optional();

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use letras minusculas, numeros e hifens.");

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a data no formato AAAA-MM-DD.");
export const nullableDateSchema = isoDateSchema.nullable().optional();

export const safeUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => !UNSAFE_SCHEME.test(value), "URL insegura.")
  .refine((value) => {
    if (/^(?:\/|#|\.\.?\/)/.test(value)) return !value.startsWith("//");
    try {
      return ["https:", "http:", "mailto:", "tel:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, "URL invalida.");

export const optionalSafeUrlSchema = safeUrlSchema.optional().or(z.literal(""));

export function assertStructuredJson(value, options = {}) {
  const maxDepth = options.maxDepth || 8;
  const maxNodes = options.maxNodes || 1000;
  let nodes = 0;

  function visit(current, depth, path) {
    nodes += 1;
    if (nodes > maxNodes) throw new Error("Conteudo excede a complexidade permitida.");
    if (depth > maxDepth) throw new Error("Conteudo excede a profundidade permitida.");
    if (typeof current === "string") {
      if (current.length > 10000) throw new Error(`Texto muito longo em ${path}.`);
      if (HTML_TAG.test(current)) throw new Error(`HTML nao e permitido em ${path}.`);
      if (UNSAFE_SCHEME.test(current)) throw new Error(`Protocolo inseguro em ${path}.`);
      return;
    }
    if (current === null || ["number", "boolean"].includes(typeof current)) return;
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, depth + 1, `${path}.${index}`));
      return;
    }
    if (!current || typeof current !== "object") throw new Error(`Tipo invalido em ${path}.`);
    Object.entries(current).forEach(([key, item]) => {
      if (["__proto__", "prototype", "constructor"].includes(key)) throw new Error(`Chave invalida em ${path}.`);
      visit(item, depth + 1, `${path}.${key}`);
    });
  }

  visit(value, 0, "data");
  return value;
}

export const revisionSchema = z.coerce.number().int().positive();
