import { test, expect } from "@playwright/test";

/**
 * Phone layout — runs in the `mobile` project only (a Pixel profile). The
 * header actions stay reachable, the sidebar is a sheet that yields to the
 * search palette, and a tall dialog scrolls to its submit button.
 */
const appHost = process.env.APP_HOST || "http://localhost:3000";

test.skip(({ isMobile }) => !isMobile, "phone layout");

async function gotoHome(page: import("@playwright/test").Page) {
  await page.goto(appHost);
  await page.waitForURL((url) => /\/platform\/[^/]+/.test(url.pathname), { timeout: 30_000 });
  return decodeURIComponent(page.url().match(/\/platform\/([^/?#]+)/)![1]);
}

test.describe("responsive journey", () => {
  test("M1 · the dashboard actions are in view and open their dialog", async ({ page }) => {
    await gotoHome(page);
    const newDeal = page.getByRole("button", { name: "New deal", exact: true });
    await expect(newDeal).toBeInViewport();
    await expect(page.getByRole("button", { name: "Log activity", exact: true })).toBeInViewport();
    await newDeal.click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("M2 · the sidebar opens as a sheet and gives way to the search palette", async ({
    page,
  }) => {
    await gotoHome(page);
    await page.getByRole("button", { name: "Toggle sidebar" }).click();
    const sheet = page.locator('[data-sidebar="sidebar"][data-mobile="true"]');
    await expect(sheet).toBeVisible();
    await sheet.getByRole("button", { name: "Search" }).click();
    await expect(page.locator("[cmdk-input]")).toBeFocused();
    await expect(sheet).toBeHidden();
  });

  test("M3 · a tall dialog scrolls to its submit button on a short screen", async ({ page }) => {
    const org = await gotoHome(page);
    await page.setViewportSize({ width: 390, height: 560 });
    await page.goto(`${appHost}/platform/${encodeURIComponent(org)}/organizations?new=1`);
    const submit = page.getByRole("button", { name: "Create organization", exact: true });
    await submit.scrollIntoViewIfNeeded();
    await expect(submit).toBeInViewport();
  });

  test("M4 · the home page scrolls as one document under a touch on its header", async ({
    page,
  }) => {
    await gotoHome(page);
    const header = await page.getByRole("heading", { name: "Home", exact: true }).boundingBox();
    const client = await page.context().newCDPSession(page);
    // A real touch sequence: the synthesized scroll gesture is a no-op headless.
    const x = 200;
    const y0 = header!.y + header!.height / 2;
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y: y0 }],
    });
    for (let i = 1; i <= 8; i++) {
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: y0 - i * 60 }],
      });
    }
    await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect
      .poll(() => page.evaluate(() => document.scrollingElement!.scrollTop))
      .toBeGreaterThan(200);
  });
});
