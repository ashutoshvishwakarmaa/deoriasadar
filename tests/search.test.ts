import { describe, expect, it } from "vitest";
import { editDistance, phonetic, search, tokenize } from "@/lib/search";

const topSlug = (q: string, locale: "en" | "hi" = "en") => search(q, locale)[0]?.id;

describe("tokenize", () => {
  it("lowercases, strips Latin diacritics and keeps Devanagari intact", () => {
    expect(tokenize("Dugdhéshwar  NATH")).toEqual(["dugdheshwar", "nath"]);
    expect(tokenize("दुग्धेश्वर नाथ मंदिर")).toEqual(["दुग्धेश्वर", "नाथ", "मंदिर"]);
  });
});

describe("phonetic folding", () => {
  it("brings common Hinglish variants together", () => {
    expect(phonetic("deoraha")).toBe(phonetic("deorah"));
    expect(phonetic("dugdheshwar")).toBe(phonetic("dugdheswar"));
    expect(editDistance(phonetic("dudheshwar"), phonetic("dugdheshwar"), 2)).toBeLessThanOrEqual(1);
  });
});

describe("search", () => {
  it("finds a temple by its exact English name", () => {
    expect(topSlug("Dugdheshwar")).toBe("place:dugdheshwar-nath-mandir");
  });

  it("tolerates Hinglish misspellings", () => {
    expect(topSlug("dudheshwar mandir")).toBe("place:dugdheshwar-nath-mandir");
    expect(topSlug("baripur")).toBe("place:baripur-mandir");
  });

  it("matches Hindi queries", () => {
    expect(topSlug("दुग्धेश्वर", "hi")).toBe("place:dugdheshwar-nath-mandir");
  });

  it("finds helplines by number and by description", () => {
    expect(topSlug("108")).toBe("emergency:108");
    expect(search("ambulance", "en").some((r) => r.id === "emergency:108")).toBe(true);
  });

  it("returns localized titles and locale-prefixed links", () => {
    const [hit] = search("baripur", "hi");
    expect(hit.title).toBe("बरीपुर मंदिर (हनुमान जी)");
    expect(hit.href).toBe("/hi/explore/baripur-mandir");
  });

  it("returns nothing for empty or one-letter queries", () => {
    expect(search("", "en")).toEqual([]);
    expect(search("a", "en")).toEqual([]);
  });
});
