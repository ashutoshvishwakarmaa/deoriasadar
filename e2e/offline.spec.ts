import { expect, test, type Page } from "@playwright/test";

/** True once the service worker holds a complete saved copy of every path. */
function saved(page: Page, paths: string[]) {
  return page.evaluate(async (list) => {
    for (const path of list) {
      const copy = await caches.match(path);
      if (!copy || !(await copy.text()).includes("</html>")) return false;
    }
    return true;
  }, paths);
}

/** Load a page, wait for the service worker to install and save the precached pages. */
async function installWorker(page: Page) {
  await page.goto("/en");
  await page.evaluate(() => navigator.serviceWorker.ready);
  // expect.poll re-runs the async check until it passes (waitForFunction would treat the Promise as truthy).
  await expect.poll(() => saved(page, ["/en/emergency", "/hi/emergency", "/hi/explore", "/en/map", "/en/search"])).toBe(true);
  // Reload so this page is controlled by the worker.
  await page.reload();
}

test.describe("offline", () => {
  test("emergency numbers, explore, map and search work without a connection", async ({ page, context }) => {
    await installWorker(page);
    await context.setOffline(true);

    await page.goto("/en/emergency");
    await expect(page.getByRole("heading", { level: 1, name: "Emergency numbers" })).toBeVisible();
    await expect(page.locator('a[href="tel:112"]')).toBeVisible();
    await expect(page.getByText("Saved for offline use")).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "You are offline" })).toBeVisible();

    await page.goto("/hi/emergency");
    await expect(page.getByRole("heading", { level: 1, name: "आपातकालीन नंबर" })).toBeVisible();

    await page.goto("/hi/explore");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("देखने योग्य स्थान");

    await page.goto("/en/map");
    await expect(page.locator(".leaflet-container")).toBeVisible();
    await expect(page.locator("path.leaflet-interactive").first()).toBeAttached();

    await page.goto("/en/search?q=blood");
    await expect(page.locator("main ul li a span.text-lg").first()).toHaveText("Blood bank");
  });

  test("pages opened before stay readable; others fall back to emergency numbers", async ({ page, context }) => {
    await installWorker(page);
    // Reached by client-side navigation, which the page reports to the worker.
    await page.goto("/en/explore");
    await page
      .getByRole("link", { name: /Hanuman Mandir/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/en\/explore\/hanuman-mandir$/);
    await expect.poll(() => saved(page, ["/en/explore/hanuman-mandir"])).toBe(true);

    await context.setOffline(true);
    await page.goto("/en/explore/hanuman-mandir");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hanuman Mandir");

    await page.goto("/en/explore/blood-bank");
    await expect(page.getByRole("heading", { level: 1, name: "Emergency numbers" })).toBeVisible();

    await context.setOffline(false);
    await page.goto("/en");
    await expect(page.getByText("You are offline")).toHaveCount(0);
  });
});
