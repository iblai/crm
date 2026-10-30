import { test as setup, expect, type Locator, type Page } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config({ path: path.resolve(__dirname, ".env.development") });

const APP_HOST = process.env.APP_HOST || "http://localhost:3000";
const AUTH_DIR = path.resolve(__dirname, "../playwright/.auth");

// The login page is found by structure, not by its copy: a password field, a
// button named like "password" that reveals it, an email field, a submit
// button. When the page changes, these four rules are what to update.
const PASSWORD_FIELD = 'input[type="password"]';
const PASSWORD_BUTTON = /password/i;
const EMAIL_FIELD = 'input[type="email"], input[name="email"], input[name="username"]';
const SUBMIT_BUTTON = /^(continue|sign in|log in)$/i;

setup.setTimeout(120_000);

const visible = (locator: Locator, timeout: number) =>
  locator.waitFor({ state: "visible", timeout }).then(
    () => true,
    () => false,
  );

/** The page's controls, for the error that says the login page changed. */
async function controls(page: Page) {
  const tree = await page
    .locator("body")
    .ariaSnapshot()
    .catch(() => "");
  return tree.split("\n").slice(0, 60).join("\n");
}

export async function signIn(page: Page, email: string, password: string, file: string) {
  await page.goto(APP_HOST, { waitUntil: "domcontentloaded", timeout: 30_000 });
  // AuthProvider sends a signed-out visitor to the login page.
  await page.waitForURL((url) => !url.href.startsWith(APP_HOST), { timeout: 60_000 });

  const passwordBox = page.locator(PASSWORD_FIELD).first();
  if (!(await visible(passwordBox, 5_000))) {
    const reveal = page.getByRole("button", { name: PASSWORD_BUTTON }).first();
    if (await visible(reveal, 30_000)) await reveal.click();
  }
  if (!(await visible(passwordBox, 15_000))) {
    throw new Error(
      `The login page offers no password sign-in I recognise. Its controls:\n${await controls(page)}\n` +
        "— update the four resolver rules at the top of e2e/auth.setup.ts, or ask your ibl.ai " +
        "operator if the page now needs a code or CAPTCHA.",
    );
  }
  const emailBox = page
    .locator(EMAIL_FIELD)
    .or(page.getByRole("textbox", { name: /email|username/i }))
    .first();
  await emailBox.fill(email);
  await passwordBox.fill(password);
  await passwordBox.press("Enter");
  // A form that ignores Enter still has a submit button.
  const submitted = await passwordBox.waitFor({ state: "hidden", timeout: 3_000 }).then(
    () => true,
    () => false,
  );
  if (!submitted) {
    await page
      .getByRole("button", { name: SUBMIT_BUTTON })
      .first()
      .click({ timeout: 5_000 })
      .catch(() => {});
  }

  try {
    await page.waitForURL((url) => url.href.startsWith(APP_HOST), { timeout: 60_000 });
  } catch {
    const refused =
      (await passwordBox.isVisible().catch(() => false)) ||
      (await page
        .getByText(/invalid|incorrect|wrong|not match/i)
        .first()
        .isVisible()
        .catch(() => false));
    if (refused) {
      throw new Error(
        `Sign-in refused for ${email}. If pnpm e2e:accounts just created this account, the platform ` +
          "did not store its password: ask your ibl.ai operator to let the user API set passwords.",
      );
    }
    const { origin, pathname } = new URL(page.url());
    throw new Error(
      `Sign-in did not return to ${APP_HOST} (stopped at ${origin}${pathname}). Add ${APP_HOST} to the ` +
        "organization's allowed redirect origins: /iblai-vibe-connect does, or ask your ibl.ai operator.",
    );
  }
  await page.waitForFunction(
    () => !!(localStorage.getItem("axd_token") || localStorage.getItem("dm_token")),
    {
      timeout: 30_000,
    },
  );
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  await page.context().storageState({ path: path.join(AUTH_DIR, file) });
}

/**
 * The admin's first run is the SDK setup flow (/iblai-vibe-house-journeys): walk
 * it once, so the journeys open the CRM instead of the wizard from here on. The
 * flow asks only what is missing: each step is taken when it shows.
 */
async function walkFirstRun(page: Page) {
  await page.goto(APP_HOST);
  await page.waitForURL(/\/platform\/[^/?#]+/, { timeout: 60_000 });
  const orgName = page.getByLabel("Organization name");
  const sector = page.getByRole("radio", { name: "Higher Education" });
  const invite = page.getByRole("heading", { name: "Invite your team" });
  const homeH1 = page.getByRole("heading", { level: 1, name: /^Home\b/ });
  await expect(orgName.or(sector).or(invite).or(homeH1).first()).toBeVisible({ timeout: 90_000 });
  if (await homeH1.isVisible()) return;
  if (await orgName.isVisible()) {
    await orgName.fill("E2E CRM");
    await page.getByRole("button", { name: "Continue" }).click();
  }
  await expect(sector.or(invite).first()).toBeVisible({ timeout: 30_000 });
  if (await sector.isVisible()) {
    await sector.click();
    await page.getByRole("button", { name: "Continue" }).click();
  }
  await expect(invite).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /^(Continue|Skip for now)$/ }).click();
  await page.getByRole("button", { name: "Complete" }).click();
  await page.waitForURL((u) => !u.pathname.includes("/onboarding"), { timeout: 60_000 });
}

setup("authenticate", async ({ page }) => {
  const email = process.env.PLAYWRIGHT_USERNAME || "";
  const password = process.env.PLAYWRIGHT_PASSWORD || "";
  if (!email || !password) {
    throw new Error(
      "PLAYWRIGHT_USERNAME and PLAYWRIGHT_PASSWORD must be set in e2e/.env.development: run pnpm e2e:accounts",
    );
  }
  // Keyed by project name (setup-chromium, …): the journeys and scripts/screenshots.mjs read it.
  await signIn(page, email, password, `user-${setup.info().project.name}.json`);
  await walkFirstRun(page);
});

setup("authenticate the member", async ({ page, browserName }) => {
  const email = process.env.PLAYWRIGHT_MEMBER_USERNAME || "";
  const password = process.env.PLAYWRIGHT_MEMBER_PASSWORD || "";
  setup.skip(
    !email || !password,
    "no member account in e2e/.env.development: pnpm e2e:accounts creates one",
  );
  await signIn(page, email, password, `member-${browserName}.json`);
});
