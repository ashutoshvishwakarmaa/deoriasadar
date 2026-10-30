import { z } from "zod";
import placesJson from "@/data/places.json";
import cityJson from "@/data/city.json";
import peopleJson from "@/data/people.json";
import officialsJson from "@/data/officials.json";
import transportJson from "@/data/transport.json";
import emergencyJson from "@/data/emergency.json";
import audiencesJson from "@/data/audiences.json";
import sourcesJson from "@/data/sources.json";
import photosJson from "@/data/photos.json";
import {
  audienceSchema,
  citySchema,
  emergencySchema,
  officialSchema,
  personSchema,
  photoSchema,
  placeSchema,
  sourceSchema,
  transportSchema,
  type PlaceCategory,
} from "./schema";

function parse<T extends z.ZodType>(schema: T, data: unknown, file: string): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid content in src/data/${file}:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export const places = parse(z.array(placeSchema), placesJson, "places.json");
export const city = parse(citySchema, cityJson, "city.json");
export const people = parse(z.array(personSchema), peopleJson, "people.json");
export const officials = parse(z.array(officialSchema), officialsJson, "officials.json");
export const transport = parse(z.array(transportSchema), transportJson, "transport.json");
export const emergencyNumbers = parse(z.array(emergencySchema), emergencyJson, "emergency.json");
export const audiences = parse(z.array(audienceSchema), audiencesJson, "audiences.json");
export const sources = parse(z.array(sourceSchema), sourcesJson, "sources.json");
export const photos = parse(z.array(photoSchema), photosJson, "photos.json");

// Cross-file integrity checks: unique slugs and resolvable source ids.
{
  const slugs = new Set<string>();
  const sourceIds = new Set(sources.map((s) => s.id));
  for (const p of places) {
    if (slugs.has(p.slug)) throw new Error(`Duplicate place slug "${p.slug}" in places.json`);
    slugs.add(p.slug);
    for (const s of p.sources) {
      if (!sourceIds.has(s)) throw new Error(`Place "${p.slug}" cites unknown source "${s}"`);
    }
  }
  const photoIds = new Set(photos.map((ph) => ph.id));
  const refs = [
    city.heroPhoto,
    ...city.gallery.map((g) => g.photo),
    ...places.flatMap((p) => (p.photoId ? [p.photoId] : [])),
    ...people.flatMap((p) => (p.photoId ? [p.photoId] : [])),
  ];
  for (const id of refs) {
    if (!photoIds.has(id)) throw new Error(`Unknown photo id "${id}" (add it to photos.json)`);
  }
  if (emergencyNumbers.filter((e) => e.featured).length !== 1) {
    throw new Error("emergency.json must mark exactly one number as featured");
  }
}

export const featuredPlaces = places.filter((p) => p.featured);
export const featuredEmergency = emergencyNumbers.find((e) => e.featured)!;
export const otherEmergency = emergencyNumbers.filter((e) => !e.featured);

export function getPhoto(id: string | undefined) {
  return id ? photos.find((p) => p.id === id) : undefined;
}

export function getPlace(slug: string) {
  return places.find((p) => p.slug === slug);
}

export function placesIn(category: PlaceCategory) {
  return places.filter((p) => p.categories.includes(category));
}

export function sourcesFor(ids: string[]) {
  return sources.filter((s) => ids.includes(s.id));
}

export function telHref(number: string) {
  return `tel:${number.replace(/-/g, "")}`;
}

export const mapCategories: PlaceCategory[] = ["faith", "health", "transport", "offices", "education"];
