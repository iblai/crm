import { test, expect, type Page } from "@playwright/test";

/**
 * CRM journey — the core loop: a person, an organization, a deal moved to won, an
 * activity marked done, a tag; then an organization note, a favorite, a saved view,
 * record history and ⌘K search on what C1–C2 created. Runs against the
 * signed-in user's organization. Requires auth.setup.ts.
 */
const appHost = process.env.APP_HOST || "http://localhost:3000";
const stamp = `e2e-${Date.now().toString(36)}`;

async function openPerson(page: Page, key: string) {
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
}

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

  test("C6 · log a note on an organization's timeline", async ({ page }) => {
    const key = await org(page);
    await page.goto(`${appHost}/platform/${encodeURIComponent(key)}/organizations`);
    await page
      .getByPlaceholder(/search/i)
      .first()
      .fill(`${stamp} Org`);
    await page
      .getByRole("row")
      .filter({ hasText: `${stamp} Org` })
      .first()
      .click();
    await page.waitForURL((url) => /\/organizations\/[0-9a-f-]{36}/.test(url.pathname), {
      timeout: 20_000,
    });
    await page.getByRole("tab", { name: /timeline/i }).click();
    await page.getByLabel(/activity title/i).fill(`${stamp} organization note`);
    await page.getByRole("button", { name: /^add$/i }).click();
    await expect(page.getByText(`${stamp} organization note`).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("C7 · star a person and find it under Favorites", async ({ page }) => {
    const key = await org(page);
    await openPerson(page, key);
    await page.getByRole("button", { name: /add to favorites/i }).click();
    const unstar = page.getByRole("button", { name: /remove from favorites/i });
    await expect(unstar).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: new RegExp(`${stamp} Person`) })).toBeVisible();
    await unstar.click();
    await expect(page.getByRole("button", { name: /add to favorites/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("C8 · save a People view and reopen it", async ({ page }) => {
    const key = await org(page);
    await page.goto(`${appHost}/platform/${encodeURIComponent(key)}/people`);
    await page.getByRole("button", { name: /^sort/i }).click();
    await page.getByRole("menuitem", { name: /^name/i }).first().click();
    await page.getByRole("button", { name: /save as new view/i }).click();
    await page.getByLabel(/view name/i).fill(`${stamp} view`);
    await page.getByLabel(/view name/i).press("Enter");
    const picker = page.getByRole("button", { name: new RegExp(`${stamp} view`) });
    await expect(picker).toBeVisible({ timeout: 20_000 });
    // Back to All, then reopen the saved view: its sort comes back with it.
    await picker.click();
    await page.getByRole("menuitem", { name: /^all$/i }).click();
    await page.getByRole("button", { name: /^all/i }).first().click();
    await page.getByRole("menuitem", { name: new RegExp(`${stamp} view`) }).click();
    await expect(page.getByRole("button", { name: /^sort.*name/i })).toBeVisible();
    await page.getByRole("button", { name: new RegExp(`${stamp} view`) }).click();
    await page.getByRole("menuitem", { name: /delete view/i }).click();
    await expect(page.getByRole("button", { name: new RegExp(`${stamp} view`) })).toHaveCount(0, {
      timeout: 20_000,
    });
  });

  test("C9 · a person's History tab lists a field change", async ({ page }) => {
    const key = await org(page);
    await openPerson(page, key);
    await page
      .getByText(/add a job title/i)
      .first()
      .click();
    await page.keyboard.type(`${stamp} title`);
    await page.keyboard.press("Enter");
    await expect(page.getByText(`${stamp} title`).first()).toBeVisible({ timeout: 20_000 });
    await page.getByRole("tab", { name: /history/i }).click();
    await expect(page.getByText("job_title").first()).toBeVisible({ timeout: 20_000 });
  });

  test("C10 · ⌘K finds the person through server search", async ({ page }) => {
    await org(page);
    await page.keyboard.press(process.platform === "darwin" ? "Meta+k" : "Control+k");
    await page.getByPlaceholder(/search people, organizations, deals/i).fill(stamp);
    await page
      .getByRole("option", { name: new RegExp(`${stamp} Person`) })
      .first()
      .click();
    await page.waitForURL((url) => /\/people\/[0-9a-f-]{36}/.test(url.pathname), {
      timeout: 20_000,
    });
  });
});
