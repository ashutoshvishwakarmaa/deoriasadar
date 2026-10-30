import { expect, test } from "@playwright/test";

test.describe("language routing", () => {
  test("sends a Hindi browser to /hi", async ({ browser }) => {
    // Chromium derives Accept-Language from the context locale.
    const context = await browser.newContext({ locale: "hi-IN" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/hi$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "hi");
    await context.close();
  });

  test("falls back to English for other languages", async ({ browser }) => {
    const context = await browser.newContext({ locale: "fr-FR" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/);
    await context.close();
  });

  test("a saved language choice beats the browser's", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ locale: "hi-IN" });
    await context.addCookies([{ name: "locale", value: "en", url: baseURL! }]);
    const page = await context.newPage();
    await page.goto("/emergency");
    await expect(page).toHaveURL(/\/en\/emergency$/);
    await context.close();
  });

  test("the language switch keeps the current page and remembers the choice", async ({ page, context }) => {
    await page.goto("/en/explore");
    await page.getByRole("group", { name: "Language" }).getByRole("link", { name: "हिन्दी" }).click();
    await expect(page).toHaveURL(/\/hi\/explore$/);
    // The English page stays mounted but hidden (React <Activity>), so match the visible heading.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("देखने योग्य स्थान");
    expect((await context.cookies()).find((c) => c.name === "locale")?.value).toBe("hi");
  });

  test("an unknown place answers 404 with a helpful page", async ({ page }) => {
    const response = await page.goto("/en/explore/no-such-place");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible();
    await expect(page).toHaveTitle("Page not found · Deoria Guide");
  });
});

test.describe("sharing and search engines", () => {
  for (const path of ["/en", "/hi/emergency", "/en/explore/hanuman-mandir"]) {
    test(`${path} has a working share card`, async ({ page, request }) => {
      await page.goto(path);
      const image = await page.locator('meta[property="og:image"]').getAttribute("content");
      expect(image).toBeTruthy();
      const res = await request.get(new URL(image!).pathname + new URL(image!).search);
      expect(res.status()).toBe(200);
      expect(res.headers()["content-type"]).toBe("image/png");
      // PNG signature, and the 1200x630 size from the IHDR chunk.
      const png = await res.body();
      expect(png.subarray(1, 4).toString()).toBe("PNG");
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
    });
  }

  test("pages publish valid structured data", async ({ page }) => {
    const typesOn = async (path: string) => {
      await page.goto(path);
      const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
      return blocks.flatMap((b) => [JSON.parse(b)].flat().map((x: { "@type": string }) => x["@type"]));
    };
    expect(await typesOn("/en")).toContain("WebSite");
    expect(await typesOn("/hi/emergency")).toEqual(["BreadcrumbList", "ItemList"]);
    expect(await typesOn("/en/explore/district-sessions-court")).toEqual(["Courthouse", "BreadcrumbList"]);
  });
});
