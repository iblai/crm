import { expect, type Locator, type Page } from "@playwright/test";
import { APP_HOST } from "../fixtures/test-data";

export const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The organization key in the current URL. */
export function orgFromUrl(page: Page): string {
  const match = page.url().match(/\/platform\/([^/?#]+)/);
  if (!match) throw new Error(`No organization in ${page.url()}`);
  return decodeURIComponent(match[1]);
}

/** Open the app root and land on the signed-in user's organization; returns its key. */
export async function gotoHome(page: Page): Promise<string> {
  await page.goto(APP_HOST);
  await page.waitForURL((url) => /\/platform\/[^/]+/.test(url.pathname), { timeout: 60_000 });
  return orgFromUrl(page);
}

export const platformUrl = (org: string, path = "") =>
  `${APP_HOST}/platform/${encodeURIComponent(org)}${path}`;

/** The page's h1: the title may be followed by a count badge, so never `exact`. */
export function heading(page: Page, title: string): Locator {
  return page.getByRole("heading", { level: 1, name: new RegExp(`^${esc(title)}\\b`) });
}

/** The SDK stores the user's organizations in localStorage; `is_admin` is per organization. */
export function checkAdminStatus(page: Page, org: string): Promise<boolean> {
  return page.evaluate((key) => {
    try {
      const tenants: Array<{ key: string; is_admin?: boolean }> = JSON.parse(
        localStorage.getItem("tenants") ?? "[]",
      );
      return !!tenants.find((t) => t.key === key)?.is_admin;
    } catch {
      return false;
    }
  }, org);
}

/** True when the locator becomes visible within `timeout` (`isVisible()` never waits). */
export function isVisibleWithin(locator: Locator, timeout = 5_000): Promise<boolean> {
  return locator.waitFor({ state: "visible", timeout }).then(
    () => true,
    () => false,
  );
}

/** The document is never wider than the viewport: nothing scrolls sideways. */
export async function expectNoSidewaysOverflow(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      { message: `${page.url()} is wider than the viewport`, timeout: 15_000 },
    )
    .toBeLessThanOrEqual(0);
}

export const SHEET = '[data-sidebar="sidebar"][data-mobile="true"]';

/**
 * Open the phone sidebar sheet and wait out its animation. Measured in the SIS:
 * right after a sheet row navigated, the first toggle tap is swallowed.
 */
export async function openSheet(page: Page) {
  const toggle = page.getByRole("button", { name: "Toggle sidebar" });
  const settled = (sel: string) => {
    const el = document.querySelector(sel);
    return !!el && el.getAttribute("data-state") === "open" && el.getAnimations().length === 0;
  };
  await expect(async () => {
    await toggle.click();
    await page.waitForFunction(settled, SHEET, { timeout: 3_000 });
  }).toPass({ timeout: 15_000 });
}

export const main = (page: Page) => page.locator("#main-content");

export const dialog = (page: Page, name: string | RegExp) => page.getByRole("dialog", { name });

export const confirmDialog = (page: Page) => page.getByRole("alertdialog");

/** Press the confirm dialog's action button. */
export async function confirm(page: Page, label: string) {
  await confirmDialog(page).getByRole("button", { name: label, exact: true }).click();
}

export const toast = (page: Page, text: string | RegExp) =>
  page.locator("[data-sonner-toast]").filter({ hasText: text });

/** A labelled row in a record's field panel (`<dt>label</dt><dd>…</dd>`). */
export function field(page: Page, label: string): Locator {
  return main(page)
    .locator("dl > div")
    .filter({ has: page.locator("dt", { hasText: new RegExp(`^${esc(label)}$`) }) });
}

/** Pick an option in an open Base UI select / menu listbox. */
export async function pickOption(page: Page, name: string | RegExp) {
  await page.getByRole("option", { name, exact: typeof name === "string" }).click();
}
