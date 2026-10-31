import { expect, test } from "@playwright/test";

test.describe("home page loading", () => {
  test("the hero photo is fetched at high priority, and the map loads only when scrolled to", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (r) => requests.push(r.url()));
    await page.goto("/en");
    await page.waitForLoadState("networkidle");

    const hero = page.locator("main figure img").first();
    await expect(hero).toHaveAttribute("fetchpriority", "high");
    await expect(hero).not.toHaveAttribute("loading", "lazy");

    // Leaflet and its tiles must not compete with the first paint.
    expect(requests.filter((u) => u.includes("tile.openstreetmap.org"))).toEqual([]);
    await expect(page.locator(".leaflet-container")).toHaveCount(0);

    await page.locator("#map").scrollIntoViewIfNeeded();
    await expect(page.locator(".leaflet-container")).toBeVisible();
  });

  for (const id of ["emergency", "gallery"]) {
    test(`a link to /en#${id} lands on that section`, async ({ page }) => {
      await page.goto(`/en#${id}`);
      // Sections below the fold skip rendering until needed; with a #section link they must not,
      // or the jump would aim at estimated heights. The header leaves a 96px offset (scroll-mt-24).
      await expect
        .poll(() => page.evaluate((s) => Math.round(document.getElementById(s)!.getBoundingClientRect().top), id))
        .toBe(96);
    });
  }
});
