import { describe, expect, it } from "vitest";
import { isUnknownPlacePath } from "@/lib/place-path";

const known = new Set(["baripur-mandir", "hanuman-mandir"]);

describe("isUnknownPlacePath", () => {
  it("lets known places through in both languages", () => {
    expect(isUnknownPlacePath("/en/explore/baripur-mandir", known)).toBe(false);
    expect(isUnknownPlacePath("/hi/explore/hanuman-mandir", known)).toBe(false);
    expect(isUnknownPlacePath("/en/explore/baripur-mandir/", known)).toBe(false);
  });

  it("flags removed or made-up places", () => {
    expect(isUnknownPlacePath("/en/explore/kushinagar", known)).toBe(true);
    expect(isUnknownPlacePath("/hi/explore/nonsense", known)).toBe(true);
  });

  it("decodes valid percent-encoding before comparing", () => {
    expect(isUnknownPlacePath("/en/explore/baripur%2Dmandir", known)).toBe(false);
  });

  it("treats malformed percent-encoding as unknown instead of throwing", () => {
    expect(() => isUnknownPlacePath("/en/explore/%", known)).not.toThrow();
    expect(isUnknownPlacePath("/en/explore/%", known)).toBe(true);
    expect(isUnknownPlacePath("/en/explore/%E0%A4%A", known)).toBe(true);
  });

  it("ignores every other route", () => {
    expect(isUnknownPlacePath("/en/explore", known)).toBe(false);
    expect(isUnknownPlacePath("/en/map", known)).toBe(false);
    expect(isUnknownPlacePath("/en/explore/a/b", known)).toBe(false);
    expect(isUnknownPlacePath("/fr/explore/zzz", known)).toBe(false);
  });
});
