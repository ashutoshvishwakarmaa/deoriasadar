import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/i18n/en.json";
import hi from "@/i18n/hi.json";
import { emergencyNumbers, featuredEmergency, featuredPlaces, officials, people, photos, places, telHref } from "@/lib/data";

function keyPaths(obj: unknown, prefix = ""): string[] {
  if (Array.isArray(obj)) return [prefix];
  if (obj && typeof obj === "object") {
    return Object.entries(obj).flatMap(([k, v]) => keyPaths(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

describe("content data", () => {
  it("loads and validates every JSON file", () => {
    expect(places.length).toBeGreaterThan(10);
    expect(officials.length).toBeGreaterThan(0);
    expect(featuredPlaces.length).toBe(6);
  });

  it("features 112 as the primary emergency number", () => {
    expect(featuredEmergency.number).toBe("112");
    expect(emergencyNumbers.map((e) => e.number)).toContain("108");
  });

  it("builds dialable tel: links", () => {
    expect(telHref("05568-222316")).toBe("tel:05568222316");
  });

  it("flags every approximate coordinate explicitly", () => {
    for (const p of places.filter((p) => p.coords)) {
      expect(p.coordsApprox, `${p.slug} has coords without an accuracy flag`).toBeTypeOf("boolean");
    }
  });
});

describe("photos", () => {
  it("every photo listed in photos.json exists on disk", () => {
    for (const ph of photos) {
      const file = path.join(process.cwd(), "public", ph.src);
      expect(existsSync(file), `${ph.id}: missing file ${ph.src}`).toBe(true);
    }
  });

  it("every portrait on the People section points at a listed photo", () => {
    const ids = new Set(photos.map((ph) => ph.id));
    const withPortrait = people.filter((p) => p.photoId);
    expect(withPortrait.length).toBeGreaterThanOrEqual(5);
    for (const p of withPortrait) expect(ids.has(p.photoId!), `${p.name.en}: unknown photo ${p.photoId}`).toBe(true);
  });
});

describe("dictionaries", () => {
  it("hi.json has exactly the same keys as en.json", () => {
    expect(keyPaths(hi).sort()).toEqual(keyPaths(en).sort());
  });

  it("has no empty strings", () => {
    const empties = (obj: unknown, path = ""): string[] =>
      typeof obj === "string"
        ? obj.trim()
          ? []
          : [path]
        : obj && typeof obj === "object"
          ? Object.entries(obj).flatMap(([k, v]) => empties(v, `${path}.${k}`))
          : [];
    expect([...empties(en, "en"), ...empties(hi, "hi")]).toEqual([]);
  });
});
