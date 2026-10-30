import { describe, expect, it } from "vitest";
import { CORRECTION_TEMPLATE, REPO_URL, suggestEditUrl } from "@/lib/suggest-edit";

describe("suggestEditUrl", () => {
  it("opens the content-correction issue form prefilled for the entry", () => {
    const url = new URL(suggestEditUrl({ entry: "Hanuman Mandir", pageUrl: "https://example.org/en/explore/hanuman-mandir" }));
    expect(`${url.origin}${url.pathname}`).toBe(`${REPO_URL}/issues/new`);
    expect(url.searchParams.get("template")).toBe(CORRECTION_TEMPLATE);
    expect(url.searchParams.get("title")).toBe("Correction: Hanuman Mandir");
    expect(url.searchParams.get("entry")).toBe("Hanuman Mandir");
    expect(url.searchParams.get("page_url")).toBe("https://example.org/en/explore/hanuman-mandir");
  });

  it("percent-encodes Hindi names and round-trips them", () => {
    const entry = "दुग्धेश्वर नाथ मंदिर";
    const raw = suggestEditUrl({ entry, pageUrl: "https://example.org/hi/explore/dugdheshwar-nath-mandir" });
    // Only ASCII in the URL, spaces as %20 (not "+"), and Devanagari as UTF-8 percent escapes.
    expect(raw).toMatch(/^[\x21-\x7e]+$/);
    expect(raw).not.toContain("+");
    expect(raw).toContain(`entry=${encodeURIComponent(entry)}`);
    expect(raw).toContain("%E0%A4%A6%E0%A5%81"); // "दु"
    const url = new URL(raw);
    expect(url.searchParams.get("entry")).toBe(entry);
    expect(url.searchParams.get("title")).toBe(`Correction: ${entry}`);
  });

  it("escapes characters that would otherwise break the query string", () => {
    const url = new URL(suggestEditUrl({ entry: "A & B #1 = ?", pageUrl: "https://example.org/en/x?y=1&z=2" }));
    expect(url.searchParams.get("entry")).toBe("A & B #1 = ?");
    expect(url.searchParams.get("page_url")).toBe("https://example.org/en/x?y=1&z=2");
    expect(url.hash).toBe("");
  });
});
