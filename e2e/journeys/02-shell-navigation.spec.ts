/**
 * Journey 2 — Shell and navigation
 *
 * The SDK sidebar rows, the breadcrumb, the collapse toggle, the profile
 * menu, the language select, the Admin mode switch and the footer dialogs.
 * Serial: nav-03, nav-05 and nav-06 change shared state and restore it.
 */
import { test, expect } from "../fixtures/crm-test";
import { PAGES, SDK } from "../fixtures/test-data";
import { platformUrl } from "../utils/app";

test.describe.configure({ mode: "serial" });

test.describe("Journey 2: Shell and Navigation — Admin", () => {
  test.beforeEach(async ({ shell }) => {
    await shell.goto("");
  });

  test("nav-01: admin clicks every sidebar row and reaches its page", async ({ shell, page }) => {
    const org = shell.orgKey;
    for (const [path, title] of PAGES.filter(([p]) => p !== "/notifications")) {
      await shell.navigate(title);
      await expect(page).toHaveURL(new RegExp(`/platform/${encodeURIComponent(org)}${path}/?$`), {
        timeout: 15_000,
      });
      await expect(shell.heading(title)).toBeVisible({ timeout: 60_000 });
    }
  });

  test("nav-02: the breadcrumb roots at the organization and ends at the page", async ({
    shell,
  }) => {
    await shell.navigate("People");
    await expect(shell.heading("People")).toBeVisible({ timeout: 60_000 });
    await expect(shell.breadcrumbRoot(/./)).toBeVisible();
    await expect(shell.breadcrumbRoot(/./)).not.toHaveText(/^\s*$/);
    await expect(shell.breadcrumbCurrent()).toHaveText("People");
  });

  test("nav-03: admin collapses the sidebar to the rail and expands it back", async ({
    shell,
    page,
  }) => {
    const root = page.locator('[data-slot="sidebar"]').first();
    await expect(root).toHaveAttribute("data-state", "expanded");
    try {
      await shell.toggleSidebar.click();
      await expect(root).toHaveAttribute("data-state", "collapsed");
      // The rail keeps the rows reachable by name.
      await expect(shell.navRow("People")).toBeVisible();
    } finally {
      await shell.toggleSidebar.click();
      await expect(root).toHaveAttribute("data-state", "expanded");
    }
  });

  test("nav-04: the profile menu offers Profile, Account and Log Out", async ({ shell }) => {
    await shell.profile.click();
    await expect(shell.menuItem(SDK.logOut)).toBeVisible();
    await expect(shell.menuItem(SDK.profileItem)).toBeVisible();
    await expect(shell.menuItem(SDK.account)).toBeVisible();
    await shell.page.keyboard.press("Escape");
  });

  test("nav-05: admin switches the language to Spanish and back", async ({ shell }) => {
    test.setTimeout(120_000);
    try {
      await shell.setLanguage("es");
      await expect(shell.navRow("Personas")).toBeVisible({ timeout: 30_000 });
    } finally {
      await shell.setLanguage("en");
      await expect(shell.navRow("People")).toBeVisible({ timeout: 30_000 });
    }
  });

  test("nav-06: User mode hides Settings and Management, survives a reload and bounces /settings home", async ({
    shell,
    page,
  }) => {
    const org = shell.orgKey;
    try {
      await shell.setAdminMode(false);
      await expect(shell.navRow("Settings")).toHaveCount(0);
      await expect(shell.footer(SDK.management)).toHaveCount(0);
      await page.goto(platformUrl(org, "/settings"));
      await page.waitForURL(new RegExp(`/platform/${encodeURIComponent(org)}/?$`), {
        timeout: 30_000,
      });
      await expect(shell.adminMode).toHaveAttribute("aria-checked", "false");
      await expect(shell.navRow("Settings")).toHaveCount(0);
    } finally {
      await shell.goto("");
      await shell.setAdminMode(true);
      await expect(shell.navRow("Settings")).toBeVisible();
    }
  });

  test("nav-07: the footer's Management opens the Management dialog, not a page", async ({
    shell,
    page,
  }) => {
    const org = shell.orgKey;
    await shell.footer(SDK.management).click();
    await expect(page.getByRole("dialog", { name: SDK.management })).toBeVisible({
      timeout: 30_000,
    });
    expect(new URL(page.url()).pathname.replace(/\/$/, "")).toBe(
      `/platform/${encodeURIComponent(org)}`,
    );
    await page.keyboard.press("Escape");
  });

  test("nav-08: the footer's Integrations and Advanced open their dialogs and Support links out", async ({
    shell,
    page,
  }) => {
    for (const name of [SDK.integrations, SDK.advanced]) {
      await shell.footer(name).click();
      await expect(page.getByRole("dialog", { name })).toBeVisible({ timeout: 30_000 });
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog", { name })).toBeHidden();
      // A row clicked while the sheet is still unmounting opens nothing (measured): let it settle.
      await page.waitForTimeout(750);
    }
    await expect(shell.sidebar.getByRole("link", { name: SDK.support })).toHaveAttribute(
      "href",
      /^https?:\/\//,
    );
  });
});
