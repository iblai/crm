import { test, expect } from "@playwright/test";

/**
 * Start journey — what a signed-out visitor sees on `/`: Sign up and Log in.
 * Runs without the pre-authenticated storage state.
 */
const appHost = process.env.APP_HOST || "http://localhost:3000";
const authHost = process.env.AUTH_HOST || "https://login.iblai.app";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("start journey", () => {
  test("A0 · a signed-out visitor sees Sign up and Log in, and Log in reaches the Auth SPA", async ({
    page,
  }) => {
    await page.goto(appHost);
    await expect(page.getByRole("button", { name: "Sign up", exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await page
      .getByRole("button", { name: "Already have an account? Log in here.", exact: true })
      .click();
    await page.waitForURL((url) => url.origin === new URL(authHost).origin, { timeout: 30_000 });
    expect(page.url()).toContain("redirect-to=");
  });
});
