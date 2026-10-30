import { describe, expect, it } from "vitest";
import { emergencyNumbers, getPlace, places } from "@/lib/data";
import { breadcrumbs, emergencyServices, place, placeList, placeType, website } from "@/lib/structured-data";

describe("structured data", () => {
  it("builds breadcrumbs from the language home page down, with absolute URLs", () => {
    const ld = breadcrumbs("hi", [{ name: "घूमें", path: "/hi/explore" }]) as { itemListElement: Record<string, unknown>[] };
    expect(ld["@type" as keyof typeof ld]).toBe("BreadcrumbList");
    expect(ld.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "देवरिया गाइड", item: "http://localhost:3000/hi" },
      { "@type": "ListItem", position: 2, name: "घूमें", item: "http://localhost:3000/hi/explore" },
    ]);
  });

  it("gives every place a specific schema.org type", () => {
    expect(placeType(getPlace("hanuman-mandir")!)).toBe("HinduTemple");
    expect(placeType(getPlace("district-hospital")!)).toBe("Hospital");
    expect(placeType(getPlace("deoria-sadar-station")!)).toBe("TrainStation");
    expect(placeType(getPlace("roadways-bus-stand")!)).toBe("BusStation");
    expect(placeType(getPlace("district-sessions-court")!)).toBe("Courthouse");
    expect(placeType(getPlace("gic-deoria")!)).toBe("School");
    for (const p of places) expect(placeType(p)).toMatch(/^[A-Z][A-Za-z]+$/);
  });

  it("describes a place with its address, location, photo and page", () => {
    const p = getPlace("dugdheshwar-nath-mandir")!;
    const ld = place(p, "hi");
    expect(ld).toMatchObject({
      "@type": "HinduTemple",
      url: "http://localhost:3000/hi/explore/dugdheshwar-nath-mandir",
      name: "दुग्धेश्वर नाथ मंदिर",
      alternateName: "Dugdheshwar Nath Mandir",
      address: { "@type": "PostalAddress", addressLocality: "रुद्रपुर", addressCountry: "IN" },
      geo: { "@type": "GeoCoordinates", latitude: p.coords![0], longitude: p.coords![1] },
    });
    expect(ld.image).toMatch(/^http:\/\/localhost:3000\/images\/photos\/.+\.(jpg|png)$/);
    expect(place(p, "en")).not.toHaveProperty("alternateName");
  });

  it("lists every place and every helpline", () => {
    expect((placeList("en").itemListElement as unknown[]).length).toBe(places.length);
    const services = emergencyServices("en").itemListElement as { item: Record<string, unknown> }[];
    expect(
      services.map((s) => (s.item.availableChannel as { servicePhone: { telephone: string } }).servicePhone.telephone),
    ).toEqual(emergencyNumbers.map((e) => e.number));
    expect(services[0].item["@type"]).toBe("GovernmentService");
  });

  it("declares the site search action with the real search URL", () => {
    const ld = website("en") as { potentialAction: { target: { urlTemplate: string } } };
    expect(ld.potentialAction.target.urlTemplate).toBe("http://localhost:3000/en/search?q={search_term_string}");
  });

  it("never lets content close the script tag", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { JsonLd } = await import("@/components/json-ld");
    const html = renderToStaticMarkup(JsonLd({ data: { name: "</script><script>alert(1)</script>" } }));
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(JSON.parse(html.replace(/^<script[^>]*>|<\/script>$/g, ""))).toEqual({ name: "</script><script>alert(1)</script>" });
  });
});
