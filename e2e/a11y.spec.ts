import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PAGES = [
  "/en",
  "/hi",
  "/en/explore",
  "/hi/explore/dugdheshwar-nath-mandir",
  "/en/emergency",
  "/hi/emergency",
  "/en/map",
  "/en/governance",
  "/hi/transport",
  "/en/search?q=mandir",
  "/en/about",
  "/hi/gallery",
];

/** WCAG 2.1 A and AA rules; serious and critical findings fail the test, with details in the message. */
async function audit(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const blocking = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  return blocking.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes
        .map((n) => n.target.join(" "))
        .slice(0, 5)
        .join("\n  ")}`,
  );
}

test.describe("accessibility", () => {
  // Scroll reveals are CSS animations that start transparent; with reduced motion they are off,
  // so axe measures the colours people actually read.
  test.use({ reducedMotion: "reduce" });

  for (const path of PAGES) {
    test(`${path} has no serious WCAG violations`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(await audit(page)).toEqual([]);
    });
  }

  test("the open assistant has no serious WCAG violations", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: "Ask about Deoria" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(await audit(page)).toEqual([]);
  });
});
