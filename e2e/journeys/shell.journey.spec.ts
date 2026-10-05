import { test, expect } from "@playwright/test";

/**
 * Shell journey — sidebar navigation, ⌘K, the organization switcher, and the
 * admin gate. Requires auth.setup.ts.
 */
const appHost = process.env.APP_HOST || "http://localhost:3000";

async function gotoHome(page: import("@playwright/test").Page) {
  await page.goto(appHost);
  await page.waitForURL((url) => /\/platform\/[^/]+/.test(url.pathname), { timeout: 30_000 });
  return decodeURIComponent(page.url().match(/\/platform\/([^/?#]+)/)![1]);
}

test.describe("shell journey", () => {
  test("S1 · the sidebar reaches every workspace object", async ({ page }) => {
    const org = await gotoHome(page);
    for (const [label, path, heading] of [
      ["People", "people", "People"],
      ["Organizations", "organizations", "Organizations"],
      ["Deals", "deals", "Deals"],
      ["Activities", "activities", "Activities"],
      ["Tags", "tags", "Tags"],
    ] as const) {
      // Sidebar rows are buttons (the SDK shell navigates on click).
      await page.getByRole("button", { name: label, exact: true }).first().click();
      await page.waitForURL(
        (url) => url.pathname.endsWith(`/platform/${encodeURIComponent(org)}/${path}`),
        {
          timeout: 15_000,
        },
      );
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible({
        timeout: 15_000,
      });
    }
  });

  test("S2 · ⌘K opens the command palette with quick actions", async ({ page }) => {
    await gotoHome(page);
    await page.keyboard.press(process.platform === "darwin" ? "Meta+k" : "Control+k");
    await expect(page.getByPlaceholder(/search people, organizations, deals/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("New person")).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("S5 · the home period select asks the overview for that window", async ({ page }) => {
    await gotoHome(page);
    await page.getByRole("combobox", { name: /period/i }).click();
    const request = page.waitForRequest(
      (req) => req.url().includes("/overview/") && req.url().includes("date_filter=7d"),
      { timeout: 20_000 },
    );
    await page.getByRole("option", { name: /last 7 days/i }).click();
    await request;
  });

  test("S3 · the profile menu names the current organization and switches", async ({ page }) => {
    const org = await gotoHome(page);
    const count = await page.evaluate(
      () => JSON.parse(localStorage.getItem("tenants") ?? "[]").length,
    );
    // The SDK profile dropdown is the last control in the top bar.
    await page.locator("header").getByRole("button").last().click();
    // It prints the platform key (showPlatformName) — assert inside the open menu,
    // not anywhere on the page, so a sidebar label cannot satisfy this.
    const menu = page.locator('[role="menu"], [role="dialog"], [data-state="open"]').last();
    await expect(menu.getByText(new RegExp(org, "i")).first()).toBeVisible({ timeout: 10_000 });
    if (count > 1) {
      await expect(menu.getByRole("menuitem").filter({ hasText: /./ }).nth(1)).toBeVisible();
    }
    await page.keyboard.press("Escape");
  });

  test("S4 · a member (or an admin in User mode) never sees Settings", async ({ page }) => {
    const org = await gotoHome(page);
    const isAdmin = await page.evaluate((key) => {
      try {
        return !!JSON.parse(localStorage.getItem("tenants") ?? "[]").find((t: any) => t.key === key)
          ?.is_admin;
      } catch {
        return false;
      }
    }, org);
    if (isAdmin) {
      await expect(page.getByRole("button", { name: "Settings", exact: true })).toBeVisible({
        timeout: 10_000,
      });
      await page.getByRole("switch", { name: /admin mode/i }).click();
    }
    await expect(page.getByRole("button", { name: "Settings", exact: true })).toHaveCount(0);
    await page.goto(`${appHost}/platform/${encodeURIComponent(org)}/settings`);
    await page.waitForURL(
      (url) =>
        url.pathname === `/platform/${encodeURIComponent(org)}` ||
        url.pathname === `/platform/${encodeURIComponent(org)}/`,
      {
        timeout: 15_000,
      },
    );
  });
});
