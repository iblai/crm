/**
 * Journey 2 — Shell and navigation
 *
 * The SDK sidebar rows, the breadcrumb, the collapse toggle, the top bar, the
 * profile menu, the Profile dialog's language, the organization chooser, the
 * Admin mode switch and the footer's organization settings.
 * Serial: nav-03, nav-05 and nav-06 change shared state and restore it.
 */
import { test, expect } from "../fixtures/crm-test";
import { APP_HOST, PAGES, SDK } from "../fixtures/test-data";
import { isVisibleWithin, platformUrl } from "../utils/app";

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

  test("nav-05: admin switches the language to Spanish in the Profile dialog and back", async ({
    shell,
    context,
  }) => {
    test.setTimeout(180_000);
    const locale = async () =>
      (await context.cookies()).find((c) => c.name === "NEXT_LOCALE")?.value;
    try {
      await shell.setLanguage("es");
      await expect(shell.navRow("Personas")).toBeVisible({ timeout: 30_000 });
      expect(await locale()).toBe("es");
    } finally {
      await shell.setLanguage("en");
      await expect(shell.navRow("People")).toBeVisible({ timeout: 30_000 });
    }
    expect(await locale()).toBe("en");
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

  test("nav-07: the footer's Management opens the organization settings on Management, not a page", async ({
    shell,
    page,
  }) => {
    const org = shell.orgKey;
    await shell.footer(SDK.management).click();
    await expect(
      shell.settings.getByRole("heading", { name: SDK.management, exact: true }),
    ).toBeVisible({ timeout: 30_000 });
    expect(new URL(page.url()).pathname.replace(/\/$/, "")).toBe(
      `/platform/${encodeURIComponent(org)}`,
    );
    await page.keyboard.press("Escape");
  });

  test("nav-08: the footer's Secrets, API and Advanced open the organization settings on their page and Support links out", async ({
    shell,
    page,
  }) => {
    const rail = shell.settings.getByRole("navigation", { name: SDK.settings, exact: true });
    const opened: string[] = [];
    // API follows a permission; Secrets and Advanced are every admin's.
    for (const name of [SDK.secrets, SDK.api, SDK.advanced]) {
      if (!(await isVisibleWithin(shell.footer(name), 2_000))) continue;
      opened.push(name);
      await shell.footer(name).click();
      await expect(shell.settings.getByRole("heading", { name, exact: true })).toBeVisible({
        timeout: 30_000,
      });
      await expect(rail.getByRole("button", { name, exact: true })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await page.keyboard.press("Escape");
      await expect(shell.settings).toBeHidden();
      // A row clicked while the sheet is still unmounting opens nothing (measured): let it settle.
      await page.waitForTimeout(750);
    }
    expect(opened).toEqual(expect.arrayContaining([SDK.secrets, SDK.advanced]));
    await expect(shell.sidebar.getByRole("link", { name: SDK.support })).toHaveAttribute(
      "href",
      /^https?:\/\//,
    );
  });

  test("nav-09: the top bar holds the Admin mode switch, the bell and the profile in the OS's order, 64 px tall, without overflow", async ({
    shell,
    page,
  }) => {
    // The dashboard's cards have headers of their own; the top bar is the first.
    const header = page.locator("header").first();
    const lefts: number[] = [];
    for (const control of [shell.adminMode, shell.bell, shell.profile]) {
      await expect(header.locator(control)).toBeVisible();
      lefts.push((await control.boundingBox())!.x);
    }
    expect(lefts).toEqual([...lefts].sort((a, b) => a - b));
    // Language is the Profile dialog's, as in the OS: the bar has no select.
    await expect(header.getByRole("combobox")).toHaveCount(0);
    const [height, scroll, client] = await header.evaluate((el) => [
      el.getBoundingClientRect().height,
      el.scrollWidth,
      el.clientWidth,
    ]);
    expect(height).toBe(64);
    expect(scroll).toBeLessThanOrEqual(client);
  });

  test("nav-10: Organizations opens the sign-in app's chooser in its own tab and this tab stays put", async ({
    shell,
    page,
  }) => {
    const org = shell.orgKey;
    const before = page.url();
    await shell.profile.click();
    // The row that names the organization is a label, not a picker.
    await expect(page.getByRole("menu").getByRole("combobox")).toHaveCount(0);
    const [chooser] = await Promise.all([
      page.context().waitForEvent("page", { timeout: 20_000 }),
      shell.menuItem(SDK.organizations).click(),
    ]);
    await chooser.waitForURL((url) => url.pathname === "/me", {
      waitUntil: "commit",
      timeout: 20_000,
    });
    const asked = new URL(chooser.url()).searchParams;
    expect(asked.get("action")).toBe("switch-tenant");
    expect(asked.get("popup")).toBe("1");
    expect(asked.get("tenant")).toBe(org);
    expect(asked.get("redirect-to")).toBe(new URL(APP_HOST).origin);
    // Nobody picks: closing the chooser is no switch, and the app remembers where the user was.
    await chooser.close();
    expect(page.url()).toBe(before);
    expect(await page.evaluate(() => sessionStorage.getItem("crm_switch_from"))).toBe(org);
  });
});
