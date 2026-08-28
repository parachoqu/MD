import { z } from "zod";
import { isoDateSchema, optionalText, plainText, slugSchema } from "./common.js";

const memberSchema = z
  .object({
    id: optionalText(160),
    name: plainText(240, { min: 1 }),
    birthDate: isoDateSchema.optional().or(z.literal("")),
    jerseyNumber: optionalText(40),
    role: optionalText(120),
  })
  .strict();

export const registrationSubmissionSchema = z
  .object({
    eventSlug: slugSchema,
    registrationType: z.enum(["team", "individual"]).default("team"),
    team: z
      .object({
        name: plainText(240, { min: 1 }),
        city: plainText(160, { min: 1 }),
        state: plainText(40, { min: 1 }),
        institution: optionalText(240),
      })
      .strict(),
    responsible: z
      .object({
        name: plainText(240, { min: 1 }),
        email: z.string().trim().email().max(320),
        phone: z.string().trim().min(10).max(80),
        role: optionalText(120),
      })
      .strict(),
    categoryId: slugSchema,
    participants: z.array(memberSchema).min(1).max(100),
    staff: z.array(memberSchema).max(30).default([]),
    consent: z.literal(true),
    regulationConsent: z.boolean(),
    consentVersion: plainText(120, { min: 1 }),
  })
  .strict();

export const contactSubmissionSchema = z
  .object({
    name: plainText(240, { min: 1 }),
    email: z.string().trim().email().max(320).optional().or(z.literal("")),
    phone: z.string().trim().max(80).optional().or(z.literal("")),
    subject: plainText(240, { min: 1 }),
    message: plainText(5000, { min: 1 }),
    consent: z.literal(true),
    consentVersion: plainText(120, { min: 1 }),
    website: z.string().max(0, "Submissao recusada.").optional().default(""),
  })
  .strict()
  .refine((value) => Boolean(value.email || value.phone), {
    path: ["email"],
    message: "Informe e-mail ou telefone.",
  });

export const mediaMetadataSchema = z
  .object({
    id: z.string().trim().min(8).max(160),
    label: plainText(160, { min: 1 }),
    alt: plainText(500, { min: 1 }),
    originalFilename: plainText(160, { min: 1 }),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    size: z.coerce.number().int().positive().max(5 * 1024 * 1024),
    width: z.coerce.number().int().positive().max(20_000).optional(),
    height: z.coerce.number().int().positive().max(20_000).optional(),
    operation: z.enum(["upload", "replace"]).default("upload"),
    revision: z.coerce.number().int().positive().optional(),
  })
  .strict();

export const mediaUpdateSchema = z
  .object({
    label: plainText(160, { min: 1 }),
    alt: plainText(500, { min: 1 }),
    revision: z.coerce.number().int().positive(),
  })
  .strict();
