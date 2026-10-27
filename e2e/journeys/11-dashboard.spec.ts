/**
 * Journey 11 — Home dashboard
 *
 * The stat cards, the period select, the header actions, the panels and
 * the onboarding card an empty organization gets (mocked, the organization
 * holds records by then).
 */
import { test, expect } from "../fixtures/crm-test";
import { personName } from "../fixtures/test-data";
import { isVisibleWithin } from "../utils/app";

test.describe("Journey 11: Home Dashboard — Admin", () => {
  test("dash-01: admin sees the six stat cards", async ({ home, dialogs, page }) => {
    test.setTimeout(180_000);
    await home.goto();
    // An organization without a single record shows the onboarding card instead.
    if (await isVisibleWithin(home.onboarding, 5_000)) {
      await home.newPerson.click();
      await dialogs.createPerson({ name: personName() });
      await page.waitForURL(/\/people\/[0-9a-f-]{36}$/, { timeout: 30_000 });
      await home.goto();
    }
    for (const stat of home.stats) {
      await expect(home.stat(stat)).toBeVisible({ timeout: 60_000 });
    }
  });

  test("dash-02: the period select asks the overview for that window", async ({ home }) => {
    await home.goto();
    await home.setPeriod("Last 7 days", "7d");
  });

  test("dash-03: the header actions open the deal, activity and person dialogs", async ({
    home,
    dialogs,
    page,
  }) => {
    await home.goto();
    await home.newDeal.click();
    await expect(page).toHaveURL(/\/deals(\?.*)?$/);
    await expect(dialogs.deal).toBeVisible({ timeout: 30_000 });
    await home.goto();
    await home.logActivity.click();
    await expect(page).toHaveURL(/\/activities(\?.*)?$/);
    await expect(dialogs.activity).toBeVisible({ timeout: 30_000 });
    await home.goto();
    await home.newPerson.click();
    await expect(page).toHaveURL(/\/people(\?.*)?$/);
    await expect(dialogs.person).toBeVisible({ timeout: 30_000 });
  });

  test("dash-04: the panels render with their links", async ({ home }) => {
    await home.goto();
    for (const title of [
      "Deals by stage",
      "Won vs lost",
      "Up next",
      "Recently added people",
      "Recent deals",
    ]) {
      await expect(home.panel(title)).toBeVisible({ timeout: 60_000 });
    }
    await expect(home.openBoard).toBeVisible();
  });

  test("dash-05: an organization without records gets the onboarding card", async ({
    home,
    page,
  }) => {
    await page.route(/\/api\/crm\/overview\//, (route) =>
      route.fulfill({
        json: { persons: { count: 0 }, organizations: { count: 0 }, deals: { open_count: 0 } },
      }),
    );
    await home.goto();
    await expect(home.onboarding).toBeVisible({ timeout: 60_000 });
    await expect(home.main.getByRole("button", { name: "Add a person" })).toBeVisible();
    await expect(home.main.getByRole("button", { name: "Create a deal" })).toBeVisible();
  });
});
