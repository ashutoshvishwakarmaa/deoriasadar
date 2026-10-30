import { expect, test, type Page } from "@playwright/test";

/** Stand in for the assistant: the real endpoint needs an API key and costs money. */
async function mockChat(page: Page, events: object[], status = 200) {
  const bodies: unknown[] = [];
  await page.route("**/api/chat", async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill(
      status === 200
        ? { status, contentType: "application/x-ndjson", body: events.map((e) => JSON.stringify(e)).join("\n") + "\n" }
        : { status, contentType: "application/json", body: JSON.stringify({ error: "x" }) },
    );
  });
  return bodies;
}

async function ask(page: Page, question: string) {
  await page.getByRole("button", { name: "Ask about Deoria" }).click();
  const dialog = page.getByRole("dialog", { name: "Deoria assistant" });
  await dialog.getByRole("textbox").fill(question);
  await dialog.getByRole("textbox").press("Enter");
  return dialog;
}

test.describe("assistant", () => {
  test("streams an answer with a working link, and takes feedback once", async ({ page }) => {
    const sent = await mockChat(page, [
      { type: "status", tool: "search_guide" },
      { type: "text", delta: "**Hanuman Mandir** is in Raghav Nagar. " },
      { type: "text", delta: "See [Hanuman Mandir](/en/explore/hanuman-mandir)." },
      { type: "done" },
    ]);
    const feedback: unknown[] = [];
    await page.route("**/api/feedback", async (route) => {
      feedback.push(route.request().postDataJSON());
      await route.fulfill({ json: { ok: true } });
    });

    await page.goto("/en");
    const dialog = await ask(page, "Where is Hanuman Mandir?");

    await expect(dialog.getByText("is in Raghav Nagar")).toBeVisible();
    await expect(dialog.locator("strong", { hasText: "Hanuman Mandir" })).toBeVisible();
    expect(sent).toEqual([{ locale: "en", messages: [{ role: "user", content: "Where is Hanuman Mandir?" }] }]);

    await dialog.getByRole("button", { name: "Helpful", exact: true }).click();
    await expect(dialog.getByText("Thanks for the feedback")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Helpful", exact: true })).toHaveCount(0);
    expect(feedback).toEqual([
      {
        rating: "up",
        locale: "en",
        question: "Where is Hanuman Mandir?",
        answer: "**Hanuman Mandir** is in Raghav Nagar. See [Hanuman Mandir](/en/explore/hanuman-mandir).",
      },
    ]);

    await dialog.getByRole("link", { name: "Hanuman Mandir" }).click();
    await expect(page).toHaveURL(/\/en\/explore\/hanuman-mandir$/);
  });

  test("explains when the assistant is unavailable and gives the question back", async ({ page }) => {
    await mockChat(page, [], 503);
    await page.goto("/hi");
    await page.getByRole("button", { name: "देवरिया के बारे में पूछें" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox").fill("डीएम ऑफिस का नंबर?");
    await dialog.getByRole("textbox").press("Enter");
    await expect(dialog.getByRole("alert")).toContainText("112");
    await expect(dialog.getByRole("textbox")).toHaveValue("डीएम ऑफिस का नंबर?");
  });

  test("tells the visitor to slow down when rate limited", async ({ page }) => {
    await mockChat(page, [], 429);
    await page.goto("/en");
    const dialog = await ask(page, "Trains to Gorakhpur?");
    await expect(dialog.getByRole("alert")).toHaveText("You are sending messages too quickly. Please wait a minute.");
  });

  test("closes with Escape and returns focus to the launcher", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: "Ask about Deoria" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Ask about Deoria" })).toBeFocused();
  });
});
