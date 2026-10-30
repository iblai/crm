/**
 * Journey 1 — Authentication
 *
 * The signed-in admin's landing, the stored session, the anonymous redirect
 * to the Auth SPA, the public /join notice, the error pages and the two
 * sign-in edges (the auth-redirect hop, the native payload).
 */
import { test, expect } from "../fixtures/crm-test";
import { APP_HOST } from "../fixtures/test-data";
import { gotoHome, orgFromUrl } from "../utils/app";

test.describe("Journey 1: Authentication — Admin", () => {
  test("auth-01: admin opens the app root and lands on the organization's home", async ({
    page,
  }) => {
    await page.goto(APP_HOST);
    await page.waitForURL((url) => /^\/platform\/[^/]+\/?$/.test(url.pathname), {
      timeout: 60_000,
    });
    await expect(page.getByRole("heading", { level: 1, name: "Home", exact: true })).toBeVisible({
      timeout: 60_000,
    });
  });

  test("auth-02: the sign-in stored both tokens and the organization list", async ({ page }) => {
    await gotoHome(page);
    const state = await page.evaluate(() => ({
      axd: !!localStorage.getItem("axd_token"),
      dm: !!localStorage.getItem("dm_token"),
      tenants: JSON.parse(localStorage.getItem("tenants") ?? "[]").length as number,
    }));
    expect(state.axd, "axd_token present").toBe(true);
    expect(state.dm, "dm_token present").toBe(true);
    expect(state.tenants, "at least one organization").toBeGreaterThan(0);
  });

  test("auth-03: the URL's organization is the session's current organization", async ({
    page,
  }) => {
    const fromUrl = await gotoHome(page);
    const fromSession = await page.evaluate(() => {
      const raw = localStorage.getItem("current_tenant") ?? "";
      try {
        const parsed = JSON.parse(raw);
        return typeof parsed === "string" ? parsed : parsed?.key;
      } catch {
        return raw || localStorage.getItem("tenant");
      }
    });
    expect(fromUrl).toBe(fromSession);
    expect(orgFromUrl(page)).toBe(fromUrl);
  });

  test("auth-08: the auth-redirect hop refuses any target but the Auth SPA", async ({
    request,
  }) => {
    const elsewhere = await request.get(`${APP_HOST}/api/auth-redirect?to=https://example.com`, {
      maxRedirects: 0,
    });
    expect(elsewhere.status()).toBe(400);
    const nothing = await request.get(`${APP_HOST}/api/auth-redirect`, { maxRedirects: 0 });
    expect(nothing.status()).toBe(400);
  });

  test("auth-09: a malformed native sign-in payload lands on the 400 page", async ({ page }) => {
    await page.goto(`${APP_HOST}/mobile-sso-login?data=x`);
    await page.waitForURL(/\/error\/400/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1, name: "Bad request" })).toBeVisible();
  });
});

test.describe("Journey 1: Authentication — Unauthenticated", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("auth-04: a visitor without a session is sent to the Auth SPA with a way back", async ({
    page,
  }) => {
    await page.goto(APP_HOST);
    await page.waitForURL(
      (url) => url.pathname.endsWith("/login") && url.searchParams.has("redirect-to"),
      { timeout: 60_000 },
    );
    expect(new URL(page.url()).origin).not.toBe(new URL(APP_HOST).origin);
  });

  test("auth-05: /join shows the create-your-organization notice", async ({ page }) => {
    await page.goto(`${APP_HOST}/join`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Create your organization" }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
    // Never clicked: it leads to the checkout.
    await expect(page.getByRole("button", { name: "Create your organization" })).toBeVisible();
  });

  test("auth-10: /join's Create your organization opens the $0 checkout that returns to this app", async ({
    page,
  }) => {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://crm.iblai.me").replace(/\/+$/, "");
    let checkout = "";
    // Answered here, so the run never reaches the checkout.
    await page.route(/credits-free-plan/, (route) => {
      checkout = route.request().url();
      return route.fulfill({ status: 204, body: "" });
    });
    await page.goto(`${APP_HOST}/join`);
    await page.getByRole("button", { name: "Create your organization" }).click();
    await expect
      .poll(() => checkout)
      .toContain("/api/service/stripe/checkout/redirect/credits-free-plan/");
    const params = new URL(checkout).searchParams;
    const back = new URL(params.get("redirect_url") ?? "");
    const cancel = new URL(params.get("cancel_url") ?? "");
    expect(back.searchParams.get("app")).toBe("crm");
    expect(back.searchParams.get("redirect-to")).toBe(appUrl);
    expect(cancel.searchParams.get("redirect-to")).toBe(`${appUrl}/join`);
  });

  test("auth-06: the 403 and 404 pages name the problem and offer a way home", async ({ page }) => {
    await page.goto(`${APP_HOST}/error/403`);
    await expect(
      page.getByRole("heading", { level: 1, name: "No access to this organization" }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Error 403")).toBeVisible();
    await expect(page.getByRole("link", { name: "Go home" })).toBeVisible();
    await page.goto(`${APP_HOST}/error/404`);
    await expect(page.getByRole("heading", { level: 1, name: "Not found" })).toBeVisible({
      timeout: 30_000,
    });
  });

  test("auth-07: an unknown error code falls back to the generic title", async ({ page }) => {
    await page.goto(`${APP_HOST}/error/418`);
    await expect(page.getByRole("heading", { level: 1, name: "Something went wrong" })).toBeVisible(
      { timeout: 30_000 },
    );
    await expect(page.getByText("Please try again.")).toBeVisible();
  });
});
