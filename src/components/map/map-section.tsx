import { mapCategories, placesIn } from "@/lib/data";
import { t, type Dictionary, type Locale } from "@/lib/i18n";
import { Container } from "../ui";
import { MapExplorer, type MapLayer } from "./map-explorer";

/** Server wrapper: localizes the place data, then hands a small payload to the client map. */
export function MapSection({ locale, dict, standalone }: { locale: Locale; dict: Dictionary; standalone?: boolean }) {
  const layers: MapLayer[] = mapCategories.map((category) => ({
    id: category,
    label: dict.map.layers[category],
    items: placesIn(category).map((p) => ({
      slug: p.slug,
      name: t(p.name, locale),
      sub: t(p.area, locale),
      href: `/${locale}/explore/${p.slug}`,
      coords: p.coords,
      approx: Boolean(p.coordsApprox),
    })),
  }));

  return (
    <section id="map" className="scroll-mt-24">
      <Container className={standalone ? "pt-16 sm:pt-20" : "pt-28"}>
        <MapExplorer
          title={dict.sections.map}
          layers={layers}
          labels={{ approx: dict.place.approxLocation, unmapped: dict.place.notMapped }}
          headingLevel={standalone ? "h1" : "h2"}
        />
      </Container>
    </section>
  );
}
