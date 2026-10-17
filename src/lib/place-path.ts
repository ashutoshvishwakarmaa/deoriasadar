const PLACE_PATH = /^\/(?:en|hi)\/explore\/([^/]+)\/?$/;

/**
 * True when `pathname` is a place URL (/{locale}/explore/{slug}) whose slug is not in `known`.
 * Malformed percent-encoding (e.g. "/en/explore/%") is treated as an unknown slug rather than
 * throwing, so the caller can answer with a 404 instead of crashing with a 500.
 */
export function isUnknownPlacePath(pathname: string, known: ReadonlySet<string>): boolean {
  const raw = PLACE_PATH.exec(pathname)?.[1];
  if (raw === undefined) return false;
  try {
    return !known.has(decodeURIComponent(raw));
  } catch {
    return true;
  }
}
