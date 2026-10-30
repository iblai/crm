/**
 * Journey 4 — People
 *
 * The person record end to end: create, find, inline edit and history,
 * favourite, lifecycle, tags, invite, link, merge, the delete guard, the
 * pagination bar, delete. Serial: every test works on the person ppl-01
 * creates (and the duplicate ppl-07 adds).
 */
import { test, expect } from "../fixtures/crm-test";
import { dealTitle, personName, tagName } from "../fixtures/test-data";
import { confirmDialog, esc } from "../utils/app";

test.describe.configure({ mode: "serial" });

const name = personName();
const email = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}@example.com`;
const duplicate = personName();
let personUrl = "";
let duplicateUrl = "";

test.describe("Journey 4: People — Admin", () => {
  test("ppl-01: admin creates a person and lands on the record", async ({
    lists,
    dialogs,
    page,
    record,
    shell,
  }) => {
    const people = lists("people");
    await people.goto();
    await people.newButton.click();
    await dialogs.createPerson({ name, email, jobTitle: "Head of Learning" });
    await page.waitForURL(/\/people\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    personUrl = page.url();
    await expect(shell.toast(`${name} added`)).toBeVisible({ timeout: 20_000 });
    await expect(record.title(name)).toBeVisible();
    await expect(shell.breadcrumbCurrent()).toHaveText(name);
  });

  test("ppl-02: the People list finds the person and its row opens the record", async ({
    lists,
    page,
  }) => {
    const people = lists("people");
    await people.goto();
    await people.searchFor(name);
    await expect(people.row(name).first()).toBeVisible({ timeout: 30_000 });
    await people.open(name);
    await expect(page).toHaveURL(personUrl, { timeout: 30_000 });
  });

  test("ppl-03: an inline edit of the job title shows up in the History tab", async ({
    page,
    record,
  }) => {
    await page.goto(personUrl);
    await record.editField("Job title", "Learning Lead");
    await record.tab("History");
    await expect(record.tabpanel.getByText("Job title").first()).toBeVisible({ timeout: 30_000 });
    await expect(record.tabpanel.getByText("Learning Lead").first()).toBeVisible();
    await expect(record.tabpanel.getByText("changed").first()).toBeVisible();
  });

  test("ppl-04: starring the person lists it under the sidebar's Favorites", async ({
    page,
    record,
    shell,
  }) => {
    await page.goto(personUrl);
    await expect(record.favorite).toHaveAttribute("aria-label", "Add to favorites");
    await record.favorite.click();
    await expect(record.favorite).toHaveAttribute("aria-label", "Remove from favorites", {
      timeout: 20_000,
    });
    const row = shell.sidebar.getByRole("button", { name: new RegExp(esc(name)) });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await record.favorite.click();
    await expect(record.favorite).toHaveAttribute("aria-label", "Add to favorites", {
      timeout: 20_000,
    });
    await expect(row).toHaveCount(0);
  });

  test("ppl-05: the lifecycle select moves the person to Qualified", async ({ page, record }) => {
    await page.goto(personUrl);
    await record.selectField("Lifecycle", "Qualified");
    await expect(record.field("Lifecycle").getByRole("combobox")).toHaveText(/Qualified/, {
      timeout: 20_000,
    });
  });

  test("ppl-06: the tag picker creates a tag and attaches it", async ({ page, record, shell }) => {
    const tag = tagName();
    await page.goto(personUrl);
    await record.addNewTag(tag);
    await expect(shell.toast(`Tag “${tag}” created`)).toBeVisible({ timeout: 20_000 });
    await expect(record.tagChip(tag)).toBeVisible();
  });

  test("ppl-07: Invite to platform needs an email, then opens the invitation confirm", async ({
    lists,
    dialogs,
    page,
    record,
  }) => {
    const people = lists("people");
    await people.goto();
    await people.newButton.click();
    await dialogs.createPerson({ name: duplicate });
    await page.waitForURL(/\/people\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    duplicateUrl = page.url();
    await expect(record.invite).toHaveAttribute("aria-label", /Add a primary email first/);

    await page.goto(personUrl);
    await record.invite.click();
    const confirm = page.getByRole("alertdialog", { name: `Invite ${name} to the platform?` });
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: "Cancel" }).click();
    await expect(confirm).toBeHidden();
  });

  test("ppl-08: More actions offers link, merge and delete; Link to user opens its dialog", async ({
    page,
    record,
    dialogs,
    shell,
  }) => {
    await page.goto(personUrl);
    await record.moreActions.click();
    for (const item of ["Link to user", "Merge duplicates", "Delete person"]) {
      await expect(shell.menuItem(item)).toBeVisible();
    }
    await page.keyboard.press("Escape");
    await record.menu("Link to user");
    await expect(dialogs.linkUser).toBeVisible();
    await dialogs.linkUser.getByRole("button", { name: "Cancel" }).click();
    await expect(dialogs.linkUser).toBeHidden();
  });

  test("ppl-09: merging a duplicate folds it into the person", async ({ page, record, shell }) => {
    await page.goto(personUrl);
    await record.merge(duplicate);
    await expect(shell.toast(`Merged 1 record into ${name}`)).toBeVisible({ timeout: 30_000 });
  });

  test("ppl-10: a person with a deal cannot be deleted until the deal goes", async ({
    page,
    record,
    dialogs,
    shell,
  }) => {
    test.setTimeout(180_000);
    await page.goto(personUrl);
    await record.tab("Deals");
    await record.tabpanel.getByRole("button", { name: "New deal" }).click();
    await dialogs.createDeal({ title: dealTitle() });
    await page.waitForURL(/\/deals\/\d+$/, { timeout: 30_000 });
    const dealUrl = page.url();

    await page.goto(personUrl);
    await record.deleteRecord("Delete person");
    await expect(shell.toast(/1 deal still references this record/)).toBeVisible({
      timeout: 20_000,
    });
    await page.keyboard.press("Escape");

    await page.goto(dealUrl);
    await record.removeDeal();
    await expect(shell.toast("Deal deleted")).toBeVisible({ timeout: 20_000 });
  });

  test("ppl-11: the pagination bar counts the matching people", async ({ lists }) => {
    const people = lists("people");
    await people.goto();
    await people.searchFor(name);
    await expect(people.pagination).toHaveText("1–1 of 1 person", { timeout: 30_000 });
    await expect(people.main.getByText(/^Page 1 of \d+$/)).toBeVisible();
  });

  test("ppl-12: admin deletes the person and the list no longer finds them", async ({
    page,
    record,
    lists,
    shell,
  }) => {
    await page.goto(personUrl);
    await record.deleteRecord("Delete person");
    await expect(shell.toast(`${name} deleted`)).toBeVisible({ timeout: 20_000 });
    await page.waitForURL(/\/people$/, { timeout: 30_000 });
    const people = lists("people");
    await people.searchFor(name);
    await expect(people.main.getByText(`No one matches “${name}”`)).toBeVisible({
      timeout: 30_000,
    });
    // The merged duplicate is inactive but still a record.
    await page.goto(duplicateUrl);
    await record.deleteRecord("Delete person");
    await expect(shell.toast(`${duplicate} deleted`)).toBeVisible({ timeout: 20_000 });
    expect(confirmDialog(page)).toBeDefined();
  });
});
