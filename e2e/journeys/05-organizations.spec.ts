/**
 * Journey 5 — Organizations
 *
 * Create, find, add a person from the record, a timeline note and the
 * history, an inline address edit, a deal from the Deals tab, delete.
 * Serial: every test works on the organization org-01 creates.
 */
import { test, expect } from "../fixtures/crm-test";
import { activityTitle, dealTitle, organizationName, personName } from "../fixtures/test-data";

test.describe.configure({ mode: "serial" });

const org = organizationName();
const contact = personName();
const deal = dealTitle();
let orgUrl = "";
let dealUrl = "";

test.describe("Journey 5: Organizations — Admin", () => {
  test("org-01: admin creates an organization and lands on the record", async ({
    lists,
    dialogs,
    page,
    record,
    shell,
  }) => {
    const organizations = lists("organizations");
    await organizations.goto();
    await organizations.newButton.click();
    await dialogs.createOrganization({ name: org });
    await page.waitForURL(/\/organizations\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    orgUrl = page.url();
    await expect(shell.toast(`${org} added`)).toBeVisible({ timeout: 20_000 });
    await expect(record.title(org)).toBeVisible();
  });

  test("org-02: the Organizations list finds it and its row opens the record", async ({
    lists,
    page,
  }) => {
    const organizations = lists("organizations");
    await organizations.goto();
    await organizations.searchFor(org);
    await expect(organizations.row(org).first()).toBeVisible({ timeout: 30_000 });
    await organizations.open(org);
    await expect(page).toHaveURL(orgUrl, { timeout: 30_000 });
  });

  test("org-03: Add person creates a contact attached to the organization", async ({
    page,
    record,
    dialogs,
  }) => {
    await page.goto(orgUrl);
    await record.addPerson.click();
    await expect(dialogs.person).toBeVisible();
    await expect(dialogs.person.getByRole("button", { name: org })).toBeVisible();
    await dialogs.createPerson({ name: contact });
    await expect(dialogs.person).toBeHidden({ timeout: 30_000 });
    await expect(page).toHaveURL(orgUrl);
    await expect(record.tabpanel.getByText(contact)).toBeVisible({ timeout: 30_000 });
  });

  test("org-04: a timeline note lands in the history and the History tab lists the creation", async ({
    page,
    record,
    shell,
  }) => {
    const note = activityTitle();
    await page.goto(orgUrl);
    await record.tab("Timeline");
    await record.log(note);
    await expect(shell.toast("Note added")).toBeVisible({ timeout: 20_000 });
    await expect(record.timelineRow(note)).toBeVisible();
    await record.tab("History");
    await expect(record.tabpanel.getByText("created this record").first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test("org-05: the street is edited inline", async ({ page, record }) => {
    await page.goto(orgUrl);
    await record.editField("Street", "1 Innovation Way");
  });

  test("org-06: the Deals tab opens a deal for the organization's contact and lists it", async ({
    page,
    record,
    dialogs,
  }) => {
    test.setTimeout(180_000);
    await page.goto(orgUrl);
    await record.tab("Deals");
    await record.tabpanel.getByRole("button", { name: "New deal" }).click();
    await dialogs.createDeal({ title: deal, person: contact });
    await page.waitForURL(/\/deals\/\d+$/, { timeout: 30_000 });
    dealUrl = page.url();
    await page.goto(orgUrl);
    await record.tab("Deals");
    await expect(record.tabpanel.getByText(deal)).toBeVisible({ timeout: 30_000 });
  });

  test("org-07: admin deletes the organization", async ({ page, record, shell }) => {
    await page.goto(dealUrl);
    await record.removeDeal();
    await expect(shell.toast("Deal deleted")).toBeVisible({ timeout: 20_000 });
    await page.goto(orgUrl);
    await record.deleteRecord("Delete organization");
    await expect(shell.toast(`${org} deleted`)).toBeVisible({ timeout: 20_000 });
    await page.waitForURL(/\/organizations$/, { timeout: 30_000 });
  });
});
