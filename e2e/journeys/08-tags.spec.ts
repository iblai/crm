/**
 * Journey 8 — Tags
 *
 * Create, search, recolour, filter the People list by a tag and delete it.
 * Serial: every test works on the tag tag-01 creates.
 */
import { test, expect } from "../fixtures/crm-test";
import { personName, tagName } from "../fixtures/test-data";

test.describe.configure({ mode: "serial" });

const tag = tagName();
const person = personName();

test.describe("Journey 8: Tags — Admin", () => {
  test("tag-01: admin creates a tag from the Tags page", async ({ lists, dialogs, shell }) => {
    const tags = lists("tags");
    await tags.goto();
    await tags.newButton.click();
    await dialogs.createTag(tag);
    await expect(shell.toast(`Tag “${tag}” created`)).toBeVisible({ timeout: 20_000 });
    await expect(tags.tagDelete(tag)).toBeVisible();
  });

  test("tag-02: the search finds the tag and says when nothing matches", async ({ lists }) => {
    const tags = lists("tags");
    await tags.goto();
    await tags.searchFor(tag);
    await expect(tags.tagDelete(tag)).toBeVisible({ timeout: 20_000 });
    await tags.searchFor("zzqx-no-such-tag-7f3a");
    await expect(tags.main.getByText("No tags match that search")).toBeVisible({ timeout: 20_000 });
  });

  test("tag-03: the colour picker recolours the tag", async ({ lists }) => {
    const tags = lists("tags");
    await tags.goto();
    await tags.searchFor(tag);
    await expect(tags.tagColor(tag)).toBeVisible({ timeout: 20_000 });
    await tags.recolorTag(tag, "#db2777");
    await expect(tags.tagColor(tag)).toHaveCSS("background-color", "rgb(219, 39, 119)");
  });

  test("tag-04: the People list filters by the tag", async ({ lists, dialogs, record, page }) => {
    test.setTimeout(180_000);
    const people = lists("people");
    await people.goto();
    await people.newButton.click();
    await dialogs.createPerson({ name: person });
    await page.waitForURL(/\/people\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    await record
      .field("Tags")
      .getByRole("button", { name: /^Add( tag)?$/ })
      .click();
    await page.getByPlaceholder("Find or create a tag…").fill(tag);
    await page.getByRole("option", { name: tag, exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(record.tagChip(tag)).toBeVisible();

    await people.goto();
    await people.addFilter("Tags", tag);
    await expect(people.row(person).first()).toBeVisible({ timeout: 30_000 });
    await expect(people.rows.filter({ hasText: "E2E Person" })).toHaveCount(1);
  });

  test("tag-05: admin deletes the tag", async ({ lists, shell }) => {
    const tags = lists("tags");
    await tags.goto();
    await tags.searchFor(tag);
    await tags.tagDelete(tag).click();
    await shell.confirm("Delete tag");
    await expect(shell.toast("Tag deleted")).toBeVisible({ timeout: 20_000 });
    await expect(tags.tagDelete(tag)).toHaveCount(0);
  });
});
