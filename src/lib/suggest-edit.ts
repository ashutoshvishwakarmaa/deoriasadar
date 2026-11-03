/** Public repository; content corrections are filed as issues here. */
export const REPO_URL = "https://github.com/ashutoshvishwakarmaa/deoriasadar";

/** Issue form in .github/ISSUE_TEMPLATE; the query keys below are the ids of its fields. */
export const CORRECTION_TEMPLATE = "content-correction.yml";

/**
 * Link to the GitHub content-correction issue form, prefilled with the entry's name and page URL.
 * Only text fields are prefilled: GitHub does not reliably prefill dropdowns from the query string.
 */
export function suggestEditUrl({ entry, pageUrl }: { entry: string; pageUrl: string }): string {
  const params: [string, string][] = [
    ["template", CORRECTION_TEMPLATE],
    ["title", `Correction: ${entry}`],
    ["entry", entry],
    ["page_url", pageUrl],
  ];
  // encodeURIComponent (not URLSearchParams) so spaces become %20 rather than "+".
  return `${REPO_URL}/issues/new?${params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}`;
}
