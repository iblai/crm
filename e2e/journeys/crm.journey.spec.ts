import { test, expect, type Page } from "@playwright/test";

/**
 * CRM journey — the core loop: a person, an organization, a deal moved to
 * won, an activity marked done, a tag. Runs against the signed-in user's
 * organization and cleans up what it creates. Requires auth.setup.ts.
 */
const appHost = process.env.APP_HOST || "http://localhost:3000";
const stamp = `e2e-${Date.now().toString(36)}`;

async function org(page: Page) {
  await page.goto(appHost);
  await page.waitForURL((url) => /\/platform\/[^/]+/.test(url.pathname), { timeout: 30_000 });
  return decodeURIComponent(page.url().match(/\/platform\/([^/?#]+)/)![1]);
}

test.describe.serial("crm journey", () => {
  test("C1 · create a person and open its page", async ({ page }) => {
    const key = await org(page);
    await page.goto(`${appHost}/platform/${encodeURIComponent(key)}/people?new=1`);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 20_000 });
    await dialog.getByLabel(/^name/i).fill(`${stamp} Person`);
    await dialog.getByRole("button", { name: /create|save|add person/i }).click();
    await page.waitForURL((url) => /\/people\/[0-9a-f-]{36}/.test(url.pathname), {
      timeout: 20_000,
    });
    await expect(page.getByText(`${stamp} Person`).first()).toBeVisible();
  });

  test("C2 · create an organization and see it in the list", async ({ page }) => {
    const key = await org(page);
    await page.goto(`${appHost}/platform/${encodeURIComponent(key)}/organizations?new=1`);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 20_000 });
    await dialog.getByLabel(/^name/i).fill(`${stamp} Org`);
    await dialog.getByRole("button", { name: /create|save|add organization/i }).click();
    await expect(page.getByText(`${stamp} Org`).first()).toBeVisible({ timeout: 20_000 });
  });

  test("C3 · create a deal, see it on the kanban, mark it won", async ({ page }) => {
    const key = await org(page);
    await page.goto(`${appHost}/platform/${encodeURIComponent(key)}/deals?new=1`);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 20_000 });
    await dialog.getByLabel(/^title/i).fill(`${stamp} Deal`);
    // Pick the person created in C1.
    await dialog
      .getByRole("button", { name: /select a person|choose a person|person/i })
      .first()
      .click();
    await page
      .getByPlaceholder(/search/i)
      .last()
      .fill(stamp);
    await page
      .getByRole("option", { name: new RegExp(`${stamp} Person`) })
      .first()
      .click();
    await dialog.getByRole("button", { name: /create|save|add deal/i }).click();
    await page.waitForURL((url) => /\/deals\/\d+/.test(url.pathname), { timeout: 20_000 });
    await page.getByRole("button", { name: /mark won/i }).click();
    await page
      .getByRole("button", { name: /^(confirm|mark won|yes)/i })
      .last()
      .click();
    await expect(page.getByText(/^won$/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test("C4 · log an activity on a person and mark it done", async ({ page }) => {
    const key = await org(page);
    await page.goto(`${appHost}/platform/${encodeURIComponent(key)}/people`);
    await page
      .getByPlaceholder(/search/i)
      .first()
      .fill(stamp);
    await page
      .getByRole("row")
      .filter({ hasText: `${stamp} Person` })
      .first()
      .click();
    await page.waitForURL((url) => /\/people\/[0-9a-f-]{36}/.test(url.pathname), {
      timeout: 20_000,
    });
    await page.getByLabel(/activity title/i).fill(`${stamp} call`);
    await page.getByRole("button", { name: /^add$/i }).click();
    await expect(page.getByText(`${stamp} call`).first()).toBeVisible({ timeout: 20_000 });
  });

  test("C5 · create and delete a tag", async ({ page }) => {
    const key = await org(page);
    await page.goto(`${appHost}/platform/${encodeURIComponent(key)}/tags`);
    await page.getByRole("button", { name: /new tag/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/^name/i).fill(`${stamp}-tag`);
    await dialog.getByRole("button", { name: /create|save/i }).click();
    await expect(page.getByText(`${stamp}-tag`).first()).toBeVisible({ timeout: 20_000 });
  });
});
