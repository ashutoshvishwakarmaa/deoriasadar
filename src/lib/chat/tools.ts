import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { audiences, city, emergencyNumbers, getPlace, officials, people, places, placesIn, sourcesFor, transport } from "../data";
import { placeCategory } from "../schema";
import { search } from "../search";

/**
 * Tools the assistant uses to read this guide's JSON data. Each tool returns
 * both languages so the model can answer in whichever one the user writes in,
 * plus a verification date so it can flag unconfirmed details.
 */

const topics = [
  "emergency_numbers",
  "officials",
  "transport",
  "city_facts",
  "history",
  "people",
  "festivals_and_language",
  "audience_tips",
] as const;

const inputs = {
  search_guide: z.object({ query: z.string().min(1).max(200) }),
  get_topic: z.object({ topic: z.enum(topics) }),
  get_places: z.object({ category: placeCategory }),
  get_place: z.object({ slug: z.string().min(1).max(100) }),
};

export type ToolName = keyof typeof inputs;

export const tools: Anthropic.Beta.BetaTool[] = [
  {
    name: "search_guide",
    description:
      "Full-text search over everything in the Deoria guide: places, temples, offices, hospitals, colleges, people, officials, helplines, transport and history. Understands English, Hindi (Devanagari) and Hinglish spellings. Use this first when you are unsure where an answer lives.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "Search words, e.g. 'dudheshwar mandir' or 'अस्पताल'" } },
      required: ["query"],
    },
    eager_input_streaming: true,
  },
  {
    name: "get_topic",
    description:
      "Return a complete section of the guide. Topics: emergency_numbers (all helplines), officials (MP, MLAs, DM, Nagar Palika), transport (rail, air, road, local), city_facts (population, PIN, STD code, vehicle code, name origin, governance), history (timeline), people (notable people), festivals_and_language, audience_tips (first steps for visitors, new residents and students).",
    input_schema: {
      type: "object",
      properties: { topic: { type: "string", enum: [...topics] } },
      required: ["topic"],
    },
    eager_input_streaming: true,
  },
  {
    name: "get_places",
    description:
      "List every place in one category: faith (temples, ashrams), tourism (day trips), health (hospitals, blood bank), transport (stations, bus stand), offices (government offices, courts), education (schools, colleges).",
    input_schema: {
      type: "object",
      properties: { category: { type: "string", enum: [...placeCategory.options] } },
      required: ["category"],
    },
    eager_input_streaming: true,
  },
  {
    name: "get_place",
    description:
      "Full details for one place by its slug (from search_guide or get_places results), including tips, phone and sources.",
    input_schema: {
      type: "object",
      properties: { slug: { type: "string" } },
      required: ["slug"],
    },
    eager_input_streaming: true,
  },
];

function placeSummary(p: (typeof places)[number]) {
  return {
    slug: p.slug,
    name: p.name,
    area: p.area,
    distance_from_city: p.distance,
    summary: p.summary,
    phone: p.phone,
    last_verified: p.verified ?? "not yet verified",
    page: `/explore/${p.slug}`,
  };
}

function runTopic(topic: (typeof topics)[number]) {
  switch (topic) {
    case "emergency_numbers":
      return { numbers: emergencyNumbers.map((e) => ({ number: e.number, label: e.label })), page: "/emergency" };
    case "officials":
      return {
        note: city.governanceNote,
        officials: officials.map((o) => ({
          role: o.role,
          name: o.name,
          details: o.meta,
          status: o.verified ? "verified" : "needs re-check — tell the user it is unconfirmed",
        })),
        page: "/governance",
      };
    case "transport":
      return {
        modes: transport,
        stations: placesIn("transport").map(placeSummary),
        page: "/transport",
      };
    case "city_facts":
      return {
        facts: city.facts,
        name_origin: city.nameOrigin,
        governance: city.governanceNote,
        last_verified: city.lastVerified,
      };
    case "history":
      return { name_origin: city.nameOrigin, timeline: city.timeline, page: "/history" };
    case "people":
      return { people: people.map(({ name, role, bio }) => ({ name, role, bio })), page: "/people" };
    case "festivals_and_language":
      return { festivals: city.festivals, language: city.languageNote, page: "/culture" };
    case "audience_tips":
      return { audiences: audiences.map((a) => ({ audience: a.label, tips: a.items })) };
  }
}

export interface ToolOutcome {
  content: string;
  isError: boolean;
}

/** Validate and run one tool call. Never throws: errors become `is_error` results for the model. */
export function runTool(name: string, rawInput: unknown): ToolOutcome {
  const schema = inputs[name as ToolName];
  if (!schema) return { content: `Unknown tool "${name}".`, isError: true };

  const parsed = schema.safeParse(rawInput);
  if (!parsed.success) {
    return { content: `Invalid input: ${z.prettifyError(parsed.error)}`, isError: true };
  }

  let result: unknown;
  switch (name as ToolName) {
    case "search_guide": {
      const { query } = parsed.data as z.infer<typeof inputs.search_guide>;
      const hits = search(query, "en", 8);
      result = hits.length
        ? hits.map((h) => {
            const place = h.type === "place" ? getPlace(h.id.slice("place:".length)) : undefined;
            return place
              ? { type: "place", ...placeSummary(place) }
              : { type: h.type, title: h.title, detail: h.subtitle, page: h.href.replace(/^\/en/, "") };
          })
        : { results: [], note: "No match in the guide. Do not guess; say the guide does not have this yet." };
      break;
    }
    case "get_topic":
      result = runTopic((parsed.data as z.infer<typeof inputs.get_topic>).topic);
      break;
    case "get_places": {
      const { category } = parsed.data as z.infer<typeof inputs.get_places>;
      result = { category, places: placesIn(category).map(placeSummary) };
      break;
    }
    case "get_place": {
      const { slug } = parsed.data as z.infer<typeof inputs.get_place>;
      const place = getPlace(slug);
      if (!place) return { content: `No place with slug "${slug}". Use search_guide to find the right slug.`, isError: true };
      result = {
        ...placeSummary(place),
        categories: place.categories,
        tips: place.tips,
        location: place.coords
          ? { lat: place.coords[0], lng: place.coords[1], approximate: Boolean(place.coordsApprox) }
          : "not yet mapped",
        sources: sourcesFor(place.sources).map((s) => ({ name: s.name, url: s.url })),
      };
      break;
    }
  }
  return { content: JSON.stringify(result), isError: false };
}
