/**
 * Journey 12 — Notifications
 *
 * The footer row opens the inbox page with the SDK panel; the bell's
 * dropdown reaches the same page.
 */
import { test, expect } from "../fixtures/crm-test";
import { SDK } from "../fixtures/test-data";

test.describe("Journey 12: Notifications — Admin", () => {
  test("notif-01: the footer's Notifications opens the inbox page with the SDK panel", async ({
    shell,
    page,
  }) => {
    await shell.goto("");
    await shell.footer("Notifications").click();
    await expect(page).toHaveURL(/\/notifications\/?$/, { timeout: 30_000 });
    await expect(shell.heading("Notifications")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("tab", { name: SDK.inboxTab })).toBeVisible({ timeout: 60_000 });
  });

  test("notif-02: the bell's dropdown links to the inbox", async ({ shell, page }) => {
    await shell.goto("");
    await expect(shell.bell).toBeVisible({ timeout: 60_000 });
    await shell.bell.click();
    await page.getByRole("button", { name: SDK.viewAll, exact: true }).click();
    await expect(page).toHaveURL(/\/notifications\/?$/, { timeout: 30_000 });
  });
});
