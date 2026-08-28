import { z } from "zod";
import { assertStructuredJson } from "./common.js";

export const SITE_PAGE_IDS = new Set(["home", "catalog"]);

export const sitePageDraftSchema = z.record(z.string(), z.unknown()).superRefine((value, context) => {
  try {
    assertStructuredJson(value);
  } catch (error) {
    context.addIssue({ code: "custom", path: [], message: error.message });
  }
});

export const settingsDraftSchema = z
  .object({
    organizationName: z.string().trim().min(1).max(240),
    shortDescription: z.string().trim().min(1).max(1000),
    email: z.string().trim().email().or(z.literal("")),
    emailIsPlaceholder: z.boolean(),
    phone: z.string().trim().max(80),
    phoneIsPlaceholder: z.boolean(),
    whatsapp: z.string().trim().max(2048),
    whatsappIsPlaceholder: z.boolean(),
    instagram: z.string().trim().max(2048),
    instagramIsPlaceholder: z.boolean(),
    address: z.string().trim().max(500),
    addressIsPlaceholder: z.boolean(),
    logoMediaId: z.string().trim().max(160).nullable().optional(),
    faviconMediaId: z.string().trim().max(160).nullable().optional(),
    seoTitle: z.string().trim().min(1).max(240),
    seoDescription: z.string().trim().min(1).max(500),
  })
  .strict()
  .superRefine((value, context) => {
    try {
      assertStructuredJson(value);
    } catch (error) {
      context.addIssue({ code: "custom", path: [], message: error.message });
    }
  });
