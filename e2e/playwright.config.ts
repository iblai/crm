import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env.development") });

const APP_HOST = process.env.APP_HOST || "http://localhost:3000";
const MOBILE_SPEC = "journeys/14-mobile-view.spec.ts";

/**
 * Playwright configuration — the OS shape: numbered journeys in `journeys/`,
 * page objects, a signed-in admin per browser plus a member context.
 *
 *   pnpm e2e:accounts          # once: the two test accounts in a throwaway organization
 *   pnpm test:e2e              # chromium + a phone
 *   pnpm test:e2e:all          # every browser
 *   pnpm test:e2e:ui / :headed
 *
 * `auth.setup.ts` signs in once per browser and saves the storage state; the
 * journeys inherit it. `utils/residue.ts` deletes the E2E-prefixed records
 * the run created.
 */
export default defineConfig({
  testDir: ".",
  globalTeardown: "./utils/residue.ts",
  // The home page waits for the DM overview reads; a fresh organization takes tens of seconds.
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "../playwright-report" }]],
  use: {
    baseURL: APP_HOST,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    // Auth setup — one per browser, runs once and saves storage state
    { name: "setup-chromium", testMatch: /auth\.setup\.ts/, use: { ...devices["Desktop Chrome"] } },
    { name: "setup-firefox", testMatch: /auth\.setup\.ts/, use: { ...devices["Desktop Firefox"] } },
    { name: "setup-webkit", testMatch: /auth\.setup\.ts/, use: { ...devices["Desktop Safari"] } },

    // Journeys — run with the pre-authenticated admin state
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/user-setup-chromium.json",
      },
      dependencies: ["setup-chromium"],
      testMatch: ["journeys/**/*.spec.ts"],
      testIgnore: [MOBILE_SPEC],
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        storageState: "playwright/.auth/user-setup-firefox.json",
      },
      dependencies: ["setup-firefox"],
      testMatch: ["journeys/**/*.spec.ts"],
      testIgnore: [MOBILE_SPEC],
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        storageState: "playwright/.auth/user-setup-webkit.json",
      },
      dependencies: ["setup-webkit"],
      testMatch: ["journeys/**/*.spec.ts"],
      testIgnore: [MOBILE_SPEC],
    },

    // Phone layout — Chromium with a Pixel profile, reusing the Chromium sign-in
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
        storageState: "playwright/.auth/user-setup-chromium.json",
      },
      dependencies: ["setup-chromium"],
      testMatch: [MOBILE_SPEC],
    },
  ],
});
