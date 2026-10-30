import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/i18n/en.json";
import hi from "@/i18n/hi.json";

type Leaf = { path: string; value: unknown };

/** Every leaf of a JSON value with its dotted path; arrays are indexed (`chat.suggestions.0`). */
function leaves(value: unknown, prefix = ""): Leaf[] {
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k));
  }
  return [{ path: prefix, value }];
}

/** Dotted paths of every array, with its length, so a short array is reported by name. */
function arrayLengths(value: unknown, prefix = ""): Map<string, number> {
  const out = new Map<string, number>();
  if (Array.isArray(value)) out.set(prefix, value.length);
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      for (const [p, n] of arrayLengths(v, prefix ? `${prefix}.${k}` : k)) out.set(p, n);
    }
  }
  return out;
}

const DEVANAGARI = /[ऀ-ॿ]/;
const PLACEHOLDER = /\{\s*[\w.]+\s*\}/g;

// Hindi strings that are deliberately not in Devanagari. Keep this list short and explain each entry.
const LATIN_IN_HINDI: Record<string, string> = {
  // The hero shows the name in both scripts: the big line in the page language, the small line in the other one.
  "home.heroSmall": "Latin-script city name under the Devanagari heading",
  // The last suggestion chip is intentionally in the other language to show the assistant is bilingual.
  "chat.suggestions.3": "English sample question on the Hindi UI",
};

const enLeaves = leaves(en);
const hiLeaves = leaves(hi);
const hiByPath = new Map(hiLeaves.map((l) => [l.path, l.value]));

describe("i18n dictionaries", () => {
  it("en.json and hi.json have identical key paths", () => {
    const enKeys = new Set(enLeaves.map((l) => l.path));
    const hiKeys = new Set(hiLeaves.map((l) => l.path));
    const missing = [...enKeys].filter((k) => !hiKeys.has(k));
    const extra = [...hiKeys].filter((k) => !enKeys.has(k));
    expect({ missingInHi: missing, extraInHi: extra }, `hi.json is out of sync with en.json`).toEqual({
      missingInHi: [],
      extraInHi: [],
    });
  });

  it("arrays have the same length in both languages", () => {
    const enArrays = arrayLengths(en);
    const hiArrays = arrayLengths(hi);
    expect(enArrays.size).toBeGreaterThan(0);
    const mismatched = [...enArrays]
      .filter(([p, n]) => hiArrays.get(p) !== n)
      .map(([p, n]) => `${p}: en ${n}, hi ${hiArrays.get(p)}`);
    expect(mismatched).toEqual([]);
  });

  it("every leaf is a non-empty string", () => {
    const bad = [
      ...enLeaves.map((l) => ({ ...l, path: `en:${l.path}` })),
      ...hiLeaves.map((l) => ({ ...l, path: `hi:${l.path}` })),
    ]
      .filter((l) => typeof l.value !== "string" || !l.value.trim())
      .map((l) => l.path);
    expect(bad).toEqual([]);
  });

  it("Hindi strings are written in Devanagari, except the allow-listed ones", () => {
    const latin = hiLeaves.filter((l) => typeof l.value === "string" && !DEVANAGARI.test(l.value)).map((l) => l.path);
    expect(latin.sort()).toEqual(Object.keys(LATIN_IN_HINDI).sort());
  });

  it("allow-listed Latin entries still exist (no stale exceptions)", () => {
    for (const key of Object.keys(LATIN_IN_HINDI)) expect(hiByPath.has(key), `stale allow-list entry ${key}`).toBe(true);
  });

  it("placeholder tokens like {name} match between languages", () => {
    const tokens = (v: unknown) => (typeof v === "string" ? (v.match(PLACEHOLDER) ?? []).sort() : []);
    const mismatched = enLeaves
      .filter((l) => tokens(l.value).join() !== tokens(hiByPath.get(l.path)).join())
      .map((l) => `${l.path}: en [${tokens(l.value)}], hi [${tokens(hiByPath.get(l.path))}]`);
    expect(mismatched).toEqual([]);
  });
});

describe("localized content in src/data", () => {
  const dataDir = path.join(process.cwd(), "src", "data");
  const files = readdirSync(dataDir).filter((f) => f.endsWith(".json"));

  /** Paths of `{ en, hi }` objects (the `Localized` shape) where either side is missing or blank. */
  function emptyLocalized(value: unknown, at: string): { found: number; empty: string[] } {
    let found = 0;
    const empty: string[] = [];
    if (value && typeof value === "object") {
      const keys = Object.keys(value);
      if (!Array.isArray(value) && keys.length === 2 && keys.includes("en") && keys.includes("hi")) {
        const loc = value as Record<string, unknown>;
        if (typeof loc.en === "string" && typeof loc.hi === "string") {
          found++;
          if (!loc.en.trim() || !loc.hi.trim()) empty.push(at);
        }
      }
      for (const [k, v] of Object.entries(value)) {
        const child = emptyLocalized(v, Array.isArray(value) ? `${at}[${k}]` : `${at}.${k}`);
        found += child.found;
        empty.push(...child.empty);
      }
    }
    return { found, empty };
  }

  it.each(files)("%s has no blank English or Hindi text", (file) => {
    const json: unknown = JSON.parse(readFileSync(path.join(dataDir, file), "utf8"));
    const { empty } = emptyLocalized(json, file);
    expect(empty).toEqual([]);
  });

  it("finds Localized values to check", () => {
    const total = files.reduce((n, f) => n + emptyLocalized(JSON.parse(readFileSync(path.join(dataDir, f), "utf8")), f).found, 0);
    expect(total).toBeGreaterThan(100);
  });
});
