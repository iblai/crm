/**
 * Journey 16 — UI render without console errors
 *
 * Every page renders as the admin and as the member with no console error
 * or page error, past a short ignore list of known noise.
 */
import { test, expect } from "../fixtures/crm-test";
import { MEMBER_EMAIL, MEMBER_PASSWORD, MEMBER_PAGES, PAGES } from "../fixtures/test-data";
import { Shell } from "../page-objects/shell.page";
import { platformUrl } from "../utils/app";
import type { Page } from "@playwright/test";

const IGNORED: ReadonlyArray<RegExp> = [
  /\[Report Only\]/, // the dev Content-Security-Policy reports, never blocks
  /gravatar/i,
  /favicon/i,
  /Failed to load resource: .*\b429\b/, // the DM throttles the suite's request burst; not the app's error
];

function collect(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !IGNORED.some((re) => re.test(message.text()))) {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  return errors;
}

async function sweep(page: Page, pages: typeof PAGES) {
  const shell = new Shell(page);
  const errors = collect(page);
  const org = await shell.goto("");
  for (const [path, title] of pages) {
    await page.goto(platformUrl(org, path));
    await expect(shell.heading(title)).toBeVisible({ timeout: 60_000 });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  }
  expect(errors, "console errors while rendering every page").toEqual([]);
}

test.describe("Journey 16: UI Render Console Errors", () => {
  test("con-01: every page renders for the admin without console errors", async ({ page }) => {
    test.setTimeout(300_000);
    await sweep(page, PAGES);
  });

  test("con-02: every page renders for the member without console errors", async ({
    memberPage,
  }) => {
    test.skip(
      !MEMBER_EMAIL || !MEMBER_PASSWORD,
      "no member account: pnpm e2e:accounts creates one",
    );
    test.setTimeout(300_000);
    await sweep(memberPage, MEMBER_PAGES);
  });
});
