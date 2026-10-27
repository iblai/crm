/**
 * Journey 14 — Mobile view (the `mobile` project, a Pixel 7)
 *
 * Every page without sideways overflow, the sidebar sheet, the search
 * palette taking over from the sheet, the dashboard actions, a tall dialog
 * on a short screen, document scrolling under a touch, and the sheet's
 * preferences row.
 */
import { test, expect } from "../fixtures/crm-test";
import { PAGES } from "../fixtures/test-data";
import { expectNoSidewaysOverflow, platformUrl } from "../utils/app";

test.describe("Journey 14: Mobile View — Admin", () => {
  test("mob-01: every page fits a phone without sideways overflow", async ({ shell, page }) => {
    test.setTimeout(300_000);
    const org = await shell.goto("");
    for (const [path, title] of PAGES) {
      await page.goto(platformUrl(org, path));
      await expect(shell.heading(title)).toBeVisible({ timeout: 60_000 });
      await expectNoSidewaysOverflow(page);
    }
  });

  test("mob-02: the sidebar sheet reaches People and closes", async ({ shell, page }) => {
    await shell.goto("");
    await shell.openSheet();
    await shell.sheet.getByRole("button", { name: "People", exact: true }).click();
    await page.waitForURL(/\/people$/, { timeout: 30_000 });
    await expect(shell.sheet).toBeHidden();
    await expect(shell.heading("People")).toBeVisible({ timeout: 60_000 });
  });

  test("mob-03: the sheet's Search gives way to the search palette", async ({ shell, page }) => {
    await shell.goto("");
    await shell.openSheet();
    await shell.sheet.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.locator("[cmdk-input]")).toBeFocused();
    await expect(shell.sheet).toBeHidden();
  });

  test("mob-04: the dashboard actions are in view and open their dialog", async ({
    home,
    dialogs,
  }) => {
    await home.goto();
    await expect(home.newDeal).toBeInViewport();
    await expect(home.logActivity).toBeInViewport();
    await home.newDeal.click();
    await expect(dialogs.deal).toBeVisible({ timeout: 30_000 });
  });

  test("mob-05: a tall dialog scrolls to its submit button on a short screen", async ({
    shell,
    page,
  }) => {
    const org = await shell.goto("");
    await page.setViewportSize({ width: 390, height: 560 });
    await page.goto(platformUrl(org, "/organizations?new=1"));
    const submit = page.getByRole("button", { name: "Create organization", exact: true });
    await expect(submit).toBeVisible({ timeout: 30_000 });
    await submit.scrollIntoViewIfNeeded();
    await expect(submit).toBeInViewport();
  });

  test("mob-06: the home page scrolls as one document under a touch on its header", async ({
    shell,
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "touch events are dispatched through CDP");
    await shell.goto("");
    const header = await shell.heading("Home").boundingBox();
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

  test("mob-07: the sheet carries the language select and the Admin mode switch", async ({
    shell,
  }) => {
    await shell.goto("");
    await shell.openSheet();
    await expect(shell.sheet.getByRole("combobox", { name: /Language|Idioma/ })).toBeVisible();
    await expect(shell.sheet.getByRole("switch", { name: "Admin mode" })).toBeVisible();
  });
});
