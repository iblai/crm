/**
 * Journey 13 — Member view
 *
 * What a member holding the CRM User role sees: the six rows, no Settings,
 * no Admin mode, Notifications only in the footer, a bounce off /settings,
 * full CRUD on people, no Account tab, and ⌘K's Settings bouncing home.
 * Runs in its own context on the member's storage state.
 */
import { test, expect } from "../fixtures/crm-test";
import { MEMBER_EMAIL, MEMBER_PASSWORD, PAGES, SDK, personName } from "../fixtures/test-data";
import { Dialogs } from "../page-objects/dialogs.page";
import { ListPage } from "../page-objects/list.page";
import { RecordPage } from "../page-objects/record.page";
import { Shell } from "../page-objects/shell.page";
import { platformUrl } from "../utils/app";

test.skip(
  !MEMBER_EMAIL || !MEMBER_PASSWORD,
  "no member account in e2e/.env.development (PLAYWRIGHT_MEMBER_*): pnpm e2e:accounts creates one",
);

test.describe("Journey 13: Member View — Non-Admin", () => {
  test("mem-01: member lands on home with the six rows", async ({ memberPage }) => {
    const shell = new Shell(memberPage);
    await shell.goto("");
    for (const [, title] of PAGES.filter(([p]) => !["/settings", "/notifications"].includes(p))) {
      await expect(shell.navRow(title)).toBeVisible();
    }
  });

  test("mem-02: member sees no Settings, no Admin mode switch and no Management", async ({
    memberPage,
  }) => {
    const shell = new Shell(memberPage);
    await shell.goto("");
    await expect(shell.footer("Notifications")).toBeVisible();
    await expect(shell.navRow("Settings")).toHaveCount(0);
    await expect(shell.adminMode).toHaveCount(0);
    await expect(shell.footer(SDK.management)).toHaveCount(0);
  });

  test("mem-03: /settings sends the member home", async ({ memberPage }) => {
    const shell = new Shell(memberPage);
    const org = await shell.goto("");
    await memberPage.goto(platformUrl(org, "/settings"));
    await memberPage.waitForURL(new RegExp(`/platform/${encodeURIComponent(org)}/?$`), {
      timeout: 30_000,
    });
  });

  test("mem-04: member creates and deletes a person", async ({ memberPage }) => {
    test.setTimeout(180_000);
    const shell = new Shell(memberPage);
    const people = new ListPage(memberPage, "people", shell);
    const dialogs = new Dialogs(memberPage);
    const record = new RecordPage(memberPage);
    const name = personName();
    await people.goto();
    await people.newButton.click();
    await dialogs.createPerson({ name });
    await memberPage.waitForURL(/\/people\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    await expect(record.title(name)).toBeVisible();
    await record.deleteRecord("Delete person");
    await expect(shell.toast(`${name} deleted`)).toBeVisible({ timeout: 20_000 });
    await memberPage.waitForURL(/\/people$/, { timeout: 30_000 });
  });

  test("mem-05: the member's profile menu has no Account item", async ({ memberPage }) => {
    const shell = new Shell(memberPage);
    await shell.goto("");
    await shell.profile.click();
    await expect(shell.menuItem(SDK.profileItem)).toBeVisible();
    await expect(shell.menuItem(SDK.logOut)).toBeVisible();
    await expect(shell.menuItem(SDK.account)).toHaveCount(0);
    await memberPage.keyboard.press("Escape");
  });

  test("mem-06: ⌘K's Settings item bounces the member home", async ({ memberPage }) => {
    const shell = new Shell(memberPage);
    const org = await shell.goto("");
    await shell.paletteGo("Settings");
    await memberPage.waitForURL(new RegExp(`/platform/${encodeURIComponent(org)}/?$`), {
      timeout: 30_000,
    });
    await expect(shell.heading("Home")).toBeVisible();
  });
});
