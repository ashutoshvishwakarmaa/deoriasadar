import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkUrl, collectUrls, readDataFiles, refusesAutomatedChecks } from "../scripts/check-links.mjs";

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
    const links = collectUrls(files);
    const urls = new Set(links.map((l) => l.url));
    const expected = [
      ...(files["sources.json"] as { url: string }[]).map((s) => s.url),
      ...(files["photos.json"] as { sourceUrl?: string; licenseUrl?: string }[]).flatMap((p) => [p.sourceUrl, p.licenseUrl]),
    ].filter(Boolean);
    for (const url of expected) expect(urls.has(url as string), url).toBe(true);
    // Photos share licence URLs, so the input has repeats; each URL must still be reported once.
    expect(new Set(expected).size).toBeLessThan(expected.length);
    expect(links.length).toBe(urls.size);
  });

  it("treats only the listed hosts as refusing automated checks", () => {
    expect(refusesAutomatedChecks("https://www.irctc.co.in/")).toBe(true);
    expect(refusesAutomatedChecks("https://enquiry.indianrail.gov.in/mntes/")).toBe(true);
    expect(refusesAutomatedChecks("https://data.gov.in/sites/default/files/x.pdf")).toBe(true);
    expect(refusesAutomatedChecks("https://linkedin.com/in/someone")).toBe(true);
    expect(refusesAutomatedChecks("https://deoria.nic.in/")).toBe(false);
    expect(refusesAutomatedChecks("https://notirctc.co.in.example.com/")).toBe(false);
  });
});

describe("check-links status", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reports a refused check on a listed site as a warning, and the same status elsewhere as broken", async () => {
    vi.stubGlobal("fetch", async () => new Response(null, { status: 403 }));
    expect(await checkUrl("https://www.irctc.co.in/")).toMatchObject({ status: "warning", code: 403 });
    expect(await checkUrl("https://example.org/")).toMatchObject({ status: "broken", code: 403 });
  });
});
