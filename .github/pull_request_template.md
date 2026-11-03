## What changed

<!-- One or two lines: which entry, and what was wrong. Link the issue if there is one, e.g. "Fixes #12". -->

## Content checklist

<!-- Code-only PR? Delete this section. -->

- [ ] Every text field has both `en` and `hi` filled in
- [ ] `verified` is today's date (`YYYY-MM-DD`) if I checked the facts, or left `null`
- [ ] Every id in `sources` exists in `src/data/sources.json` (add new sources there)
- [ ] `coordsApprox: true` is set unless the coordinates were surveyed on site
- [ ] New photos have `author`, `license`, `licenseUrl` and `sourceUrl`
- [ ] Phone numbers and officials have a source I can link to
- [ ] `npm test` passes (CI runs it, and the build, on this PR)
