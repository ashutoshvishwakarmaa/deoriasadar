import { expect, test, type Page } from "@playwright/test";

const resultTitles = (page: Page) => page.locator("main ul li a span.text-lg");

test.describe("search", () => {
  test("searching from the home page shows results without calling an API", async ({ page }) => {
    const apiCalls: string[] = [];
    page.on("request", (r) => r.url().includes("/api/") && apiCalls.push(r.url()));
    await page.goto("/en");
    await page.locator("form[role=search] input").first().fill("dudheshwar mandir");
    await page.locator("form[role=search] button[type=submit]").first().click();
    await expect(page).toHaveURL(/\/en\/search\?q=dudheshwar/);
    await expect(resultTitles(page).first()).toHaveText("Dugdheshwar Nath Mandir");
    expect(apiCalls).toEqual([]);
  });

  test("understands Hindi, and Latin spelling on the Hindi site", async ({ page }) => {
    await page.goto(`/hi/search?q=${encodeURIComponent("अस्पताल")}`);
    await expect(resultTitles(page).first()).toHaveText("ज़िला अस्पताल");
    await page.goto("/hi/search?q=hanuman");
    await expect(resultTitles(page).first()).toHaveText("हनुमान मंदिर");
  });

  test("says so when nothing matches", async ({ page }) => {
    await page.goto("/en/search?q=zzqqxx");
    await expect(page.getByText("Nothing matched")).toBeVisible();
    await expect(resultTitles(page)).toHaveCount(0);
  });
});
