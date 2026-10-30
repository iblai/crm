/**
 * Journey 18 — Sample data on the community organization
 *
 * A user who belongs to no organization but the community one browses the CRM
 * on its sample data: the notice, sample rows on every list and record, no
 * admin surface, and a write that opens the upgrade dialog instead of reaching
 * the platform. The member's session is told it belongs to `main` alone, in
 * storage and by the routed membership lists. Nothing reaches the checkout:
 * smp-06 answers it locally.
 */
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "../fixtures/crm-test";
import { MEMBER_EMAIL, MEMBER_PASSWORD } from "../fixtures/test-data";
import { Dialogs } from "../page-objects/dialogs.page";
import { ListPage } from "../page-objects/list.page";
import { Shell } from "../page-objects/shell.page";
import { platformUrl } from "../utils/app";
import type { Page } from "@playwright/test";

const MAIN = process.env.NEXT_PUBLIC_MAIN_TENANT_KEY || "main";
/** The installed web-containers declares the upgrade dialog's `checkoutUrl` (iblai-web-frontend#2195). */
const sdkHasCheckoutUrl = fs
  .readFileSync(
    path.resolve(__dirname, "../../node_modules/@iblai/web-containers/dist/index.d.ts"),
    "utf8",
  )
  .includes("checkoutUrl");

test.skip(
  !MEMBER_EMAIL || !MEMBER_PASSWORD,
  "no member account in e2e/.env.development (PLAYWRIGHT_MEMBER_*): pnpm e2e:accounts creates one",
);

/** The member's session, told it belongs to the community organization only. */
async function onMain(page: Page) {
  const entry = { key: MAIN, org: MAIN, platform_name: "ibl.ai", is_admin: false };
  await page
    .context()
    .route(/\/api\/ibl\/users\/manage\/platform\//, (route) => route.fulfill({ json: [entry] }));
  // The list newer web-utils reads: the member's real memberships, `main` alone kept.
  await page.context().route(/\/api\/core\/users\/platforms\//, async (route) => {
    const res = await route.fetch();
    const all = (await res.json()) as { key: string }[];
    await route.fulfill({ response: res, json: all.filter((p) => p.key === MAIN) });
  });
  await page.context().addInitScript((only: typeof entry) => {
    localStorage.setItem("tenants", JSON.stringify([only]));
    localStorage.setItem("tenant", only.key);
    localStorage.setItem("current_tenant", JSON.stringify(only));
  }, entry);
  await page.goto(platformUrl(MAIN));
  await expect(page.getByTestId("sample-notice")).toBeVisible({ timeout: 60_000 });
}

test.describe("Journey 18: Sample Data — the community organization", () => {
  test("smp-01: home carries the sample notice and the sample's recent deals", async ({
    memberPage,
  }) => {
    await onMain(memberPage);
    await expect(memberPage.getByTestId("sample-notice")).toContainText("sample data");
    await expect(
      memberPage
        .getByTestId("sample-notice")
        .getByRole("button", { name: "Create your organization" }),
    ).toBeVisible();
    await expect(memberPage.locator("#main-content")).toContainText("Advisory retainer", {
      timeout: 30_000,
    });
  });

  test("smp-02: People lists the sample people and a person's record opens", async ({
    memberPage,
  }) => {
    await onMain(memberPage);
    const shell = new Shell(memberPage);
    const people = new ListPage(memberPage, "people", shell);
    await memberPage.goto(platformUrl(MAIN, "/people"));
    await expect(people.row("Ava Thompson").first()).toBeVisible({ timeout: 30_000 });
    await people.open("Ava Thompson");
    await memberPage.waitForURL(/\/people\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    await expect(memberPage.locator("#main-content")).toContainText("Alder Health", {
      timeout: 30_000,
    });
  });

  test("smp-03: Organizations, Deals, Activities and Tags show the sample's rows", async ({
    memberPage,
  }) => {
    await onMain(memberPage);
    const main = memberPage.locator("#main-content");
    for (const [route, text] of [
      ["/organizations", "Harborview Clinics"],
      ["/deals", "Telehealth pilot"],
      ["/activities", "Contract walkthrough"],
      ["/tags", "Enterprise"],
    ] as const) {
      await memberPage.goto(platformUrl(MAIN, route));
      await expect(main).toContainText(text, { timeout: 30_000 });
    }
  });

  test("smp-04: creating a person opens the upgrade dialog and reaches no platform", async ({
    memberPage,
  }) => {
    const writes: string[] = [];
    memberPage.on("request", (req) => {
      if (/\/dm\/api\/crm\//.test(req.url()) && req.method() !== "GET") writes.push(req.url());
    });
    await onMain(memberPage);
    const shell = new Shell(memberPage);
    const people = new ListPage(memberPage, "people", shell);
    await memberPage.goto(platformUrl(MAIN, "/people"));
    await expect(people.row("Ava Thompson").first()).toBeVisible({ timeout: 30_000 });
    await people.newButton.click();
    await new Dialogs(memberPage).createPerson({ name: "E2E Sample Visitor" });
    await expect(
      memberPage.getByRole("dialog").filter({ hasText: "Upgrade for free" }),
    ).toBeVisible({
      timeout: 15_000,
    });
    expect(writes).toEqual([]);
  });

  test("smp-05: the sample grants no admin surface: no Settings row, no Admin mode switch", async ({
    memberPage,
  }) => {
    await onMain(memberPage);
    const shell = new Shell(memberPage);
    await expect(shell.navRow("People")).toBeVisible({ timeout: 30_000 });
    await expect(shell.navRow("Settings")).toHaveCount(0);
    await expect(shell.adminMode).toHaveCount(0);
  });

  test("smp-06: the upgrade dialog's Upgrade for free opens the CRM's $0 checkout", async ({
    memberPage,
  }) => {
    test.skip(
      !sdkHasCheckoutUrl,
      "web-containers lacks checkoutUrl: the release of iblai-web-frontend#2195",
    );
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://crm.iblai.me").replace(/\/+$/, "");
    let checkout = "";
    // Answered here, so the run never reaches the checkout.
    await memberPage.route(/credits-free-plan/, (route) => {
      checkout = route.request().url();
      return route.fulfill({ contentType: "text/html", body: "<title>checkout stub</title>" });
    });
    await onMain(memberPage);
    await memberPage
      .getByTestId("sample-notice")
      .getByRole("button", { name: "Create your organization" })
      .click();
    await memberPage.getByRole("dialog").getByRole("button", { name: "Upgrade for free" }).click();
    await expect
      .poll(() => checkout)
      .toContain("/api/service/stripe/checkout/redirect/credits-free-plan/");
    const params = new URL(checkout).searchParams;
    const back = new URL(params.get("redirect_url") ?? "");
    expect(back.searchParams.get("app")).toBe("crm");
    expect(back.searchParams.get("redirect-to")).toBe(appUrl);
    expect(new URL(params.get("cancel_url") ?? "").searchParams.get("redirect-to")).toBe(
      `${appUrl}/join`,
    );
  });
});
