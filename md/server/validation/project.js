import { z } from "zod";
import { optionalText, plainText, slugSchema } from "./common.js";

export const projectDraftSchema = z
  .object({
    slug: slugSchema.optional(),
    category: z.enum(["empresas", "escolas", "comunidades"]),
    title: plainText(240, { min: 1 }),
    status: plainText(120, { min: 1 }),
    date: plainText(160, { min: 1 }),
    description: plainText(3000, { min: 1 }),
    note: optionalText(2000),
    image: optionalText(600),
    imageAlt: plainText(500, { min: 1 }),
    mediaId: optionalText(160).nullable(),
  })
  .strict();
