import { z } from "zod";

/**
 * Schemas for the JSON content in src/data. Every file is parsed at module load
 * (see lib/data.ts), so a malformed edit fails `next build` instead of reaching users.
 */

export const localized = z.object({
  en: z.string().min(1),
  hi: z.string().min(1),
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

export const placeCategory = z.enum(["faith", "health", "transport", "offices", "education"]);
export type PlaceCategory = z.infer<typeof placeCategory>;

export const placeSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  categories: z.array(placeCategory).min(1),
  featured: z.boolean().optional(),
  name: localized,
  aliases: z.array(z.string()).default([]),
  area: localized,
  distance: localized.optional(),
  summary: localized,
  tips: localized.optional(),
  /** Placeholder label shown until a real photo exists. */
  photo: z.string().optional(),
  /** Id of an entry in photos.json. */
  photoId: z.string().optional(),
  phone: z.string().optional(),
  coords: z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]).optional(),
  coordsApprox: z.boolean().optional(),
  verified: isoDate.nullable(),
  sources: z.array(z.string()),
});
export type Place = z.infer<typeof placeSchema>;

export const citySchema = z.object({
  name: localized,
  lastVerified: isoDate,
  facts: z.array(z.object({ label: localized, value: localized })),
  nameOrigin: localized,
  languageNote: localized,
  governanceNote: localized,
  timeline: z.array(z.object({ period: localized, event: localized })),
  festivals: z.array(localized),
  heroPhoto: z.string(),
  gallery: z.array(z.object({ photo: z.string(), span: z.union([z.literal(1), z.literal(2)]) })),
});
export type City = z.infer<typeof citySchema>;

export const photoSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  src: z.string().startsWith("/images/"),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  caption: localized,
  author: z.string().min(1),
  license: z.string().min(1),
  licenseUrl: z.url(),
  sourceUrl: z.url(),
  /** The owner's reuse terms require written permission that has not been confirmed yet. */
  permissionPending: z.boolean().optional(),
  /** CSS object-position for cropping, e.g. "50% 30%" to keep a face in frame. */
  focus: z
    .string()
    .regex(/^\d{1,3}% \d{1,3}%$/)
    .optional(),
  /** "contain" shows the whole image (wide signs, seals) instead of cropping it to the frame. */
  fit: z.enum(["cover", "contain"]).optional(),
});
export type Photo = z.infer<typeof photoSchema>;

export const personSchema = z.object({
  name: localized,
  role: localized,
  bio: localized,
  /** Id of a portrait in photos.json; people without one show a neutral placeholder. */
  photoId: z.string().optional(),
});
export type Person = z.infer<typeof personSchema>;

export const officialSchema = z.object({
  role: localized,
  name: localized,
  meta: localized,
  verified: z.boolean(),
});
export type Official = z.infer<typeof officialSchema>;

export const transportSchema = z.object({ mode: localized, head: localized, body: localized });

export const emergencySchema = z.object({
  number: z.string().regex(/^[0-9-]+$/),
  label: localized,
  featured: z.boolean().optional(),
});

export const audienceSchema = z.object({
  id: z.string(),
  label: localized,
  items: z.array(z.object({ title: localized, body: localized })),
});

export const sourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.url(),
  usedFor: z.string(),
});
