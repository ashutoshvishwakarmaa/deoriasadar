import path from "node:path";
import { describe, expect, it } from "vitest";
import { collectUrls, readDataFiles } from "../scripts/check-links.mjs";

describe("check-links URL collection", () => {
  it("finds URLs in any field, at any depth, and de-duplicates them", () => {
    const links = collectUrls({
      "sources.json": [
        { id: "a", url: "https://example.org/history/" },
        { id: "b", url: "https://example.org/history/" },
      ],
      "photos.json": [
        { sourceUrl: "https://commons.wikimedia.org/wiki/File:Temple_(Deoria).jpg", licenseUrl: "https://example.org/history/" },
      ],
      "places.json": { tips: { en: "Timings on the board (see https://example.com/timings). Call ahead.", hi: "कोई लिंक नहीं" } },
    });
    expect(links.map((l) => l.url)).toEqual([
      "https://example.org/history/",
      "https://commons.wikimedia.org/wiki/File:Temple_(Deoria).jpg",
      "https://example.com/timings",
    ]);
    expect(links[0].refs).toEqual(["sources.json[0].url", "sources.json[1].url", "photos.json[0].licenseUrl"]);
    expect(links[2].refs).toEqual(["places.json.tips.en"]);
  });

  it("ignores non-URL strings, numbers and nulls", () => {
    expect(collectUrls({ "x.json": { a: "deoria.nic.in", b: 12, c: null, d: ["ftp://example.org", "mailto:x@y.z"] } })).toEqual(
      [],
    );
  });

  it("collects every source and photo link from the real content files", () => {
    const files = readDataFiles(path.join(process.cwd(), "src", "data"));
    const urls = new Set(collectUrls(files).map((l) => l.url));
    const expected = [
      ...(files["sources.json"] as { url: string }[]).map((s) => s.url),
      ...(files["photos.json"] as { sourceUrl?: string; licenseUrl?: string }[]).flatMap((p) => [p.sourceUrl, p.licenseUrl]),
    ].filter(Boolean);
    for (const url of expected) expect(urls.has(url as string), url).toBe(true);
    expect(urls.size).toBeLessThan(expected.length); // photos share licence URLs, so de-duplication must have kicked in
  });
});
