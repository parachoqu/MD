import { z } from "zod";
import {
  isoDateSchema,
  nullableDateSchema,
  nullableText,
  optionalSafeUrlSchema,
  optionalText,
  plainText,
  slugSchema,
} from "./common.js";

export const EVENT_STATUSES = ["open", "soon", "closed", "finished", "cancelled", "full"];

const categorySchema = z
  .object({
    id: slugSchema,
    name: plainText(160, { min: 1 }),
    division: optionalText(160),
    gender: optionalText(80),
  })
  .strict();

const nonNegativeOptional = z.coerce.number().int().nonnegative().optional();

export const eventDraftSchema = z
  .object({
    id: z.string().trim().min(1).max(160).optional(),
    slug: slugSchema,
    title: plainText(240, { min: 1 }),
    shortTitle: optionalText(160),
    sport: plainText(100, { min: 1 }),
    sportKey: slugSchema,
    featured: z.boolean().default(false),
    demo: z.boolean().default(false),
    status: z.enum(EVENT_STATUSES),
    summary: plainText(1200, { min: 1 }),
    description: plainText(6000, { min: 1 }),
    date: z
      .object({
        label: plainText(200, { min: 1 }),
        start: nullableDateSchema,
        end: nullableDateSchema,
        sort: isoDateSchema.or(z.literal("")),
      })
      .strict(),
    registrationPeriod: z
      .object({
        start: nullableDateSchema,
        end: nullableDateSchema,
        label: plainText(200, { min: 1 }),
      })
      .strict(),
    location: z
      .object({
        venue: nullableText(240),
        city: nullableText(160),
        state: nullableText(40),
      })
      .strict(),
    capacity: z
      .object({ teams: nonNegativeOptional, label: optionalText(160) })
      .strict()
      .optional(),
    categories: z.array(categorySchema).max(100),
    schedule: z
      .array(z.object({ label: plainText(200, { min: 1 }), value: plainText(1200, { min: 1 }) }).strict())
      .max(100),
    registrationDetails: z
      .object({
        feePerTeam: optionalText(200),
        dualInstitutionFee: optionalText(300),
        period: optionalText(200),
        maxMembers: nonNegativeOptional,
        maxAthletes: nonNegativeOptional,
        maxStaff: nonNegativeOptional,
        matchRosterLimit: nonNegativeOptional,
      })
      .strict()
      .optional(),
    regulation: z
      .object({
        available: z.boolean(),
        id: nullableText(160),
        title: plainText(200, { min: 1 }),
        label: plainText(240, { min: 1 }),
        pages: z.coerce.number().int().positive().nullable().optional(),
        version: optionalText(120),
        publishedAt: nullableText(80),
        reference: optionalText(400),
        toBeConfirmed: z.boolean().optional(),
      })
      .strict(),
    highlights: z
      .array(z.object({ title: plainText(240, { min: 1 }), detail: plainText(2000, { min: 1 }) }).strict())
      .max(100)
      .optional(),
    sponsors: z
      .array(
        z
          .object({
            id: optionalText(160),
            name: plainText(240, { min: 1 }),
            note: optionalText(1000),
            logo: optionalText(600),
            alt: optionalText(300),
            url: optionalSafeUrlSchema,
          })
          .strict()
      )
      .max(100),
    organization: plainText(240, { min: 1 }),
    registrationType: z.enum(["team", "individual"]),
    registrationConfig: z
      .object({
        minParticipants: nonNegativeOptional,
        maxParticipants: nonNegativeOptional,
        birthDateRequired: z.boolean().optional(),
        jerseyNumberRequired: z.boolean().optional(),
        maxStaff: nonNegativeOptional,
        privacyConsentVersion: optionalText(120),
      })
      .strict(),
    keywords: z.array(plainText(120)).max(100),
    visual: z
      .object({
        label: plainText(120, { min: 1 }),
        accent: plainText(80, { min: 1 }),
        image: optionalText(600),
        imageAlt: plainText(500, { min: 1 }),
        mediaId: nullableText(160),
      })
      .strict(),
  })
  .strict()
  .superRefine((event, context) => {
    if (event.date.start && event.date.end && event.date.end < event.date.start) {
      context.addIssue({ code: "custom", path: ["date", "end"], message: "A data final deve ser posterior a inicial." });
    }
    if (event.registrationPeriod.start && event.registrationPeriod.end && event.registrationPeriod.end < event.registrationPeriod.start) {
      context.addIssue({ code: "custom", path: ["registrationPeriod", "end"], message: "O fim das inscricoes deve ser posterior ao inicio." });
    }
    const ids = event.categories.map((item) => item.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: "custom", path: ["categories"], message: "IDs de categoria devem ser unicos." });
    }
    const min = event.registrationConfig.minParticipants;
    const max = event.registrationConfig.maxParticipants;
    if (min !== undefined && max !== undefined && max < min) {
      context.addIssue({ code: "custom", path: ["registrationConfig", "maxParticipants"], message: "O maximo nao pode ser menor que o minimo." });
    }
  });
