/**
 * Journey 9 — Saved views (the People list)
 *
 * Sort, save as a view, switch views, add a filter and update, hide a
 * column, clear the filters, delete the view. Serial on one view.
 */
import { test, expect } from "../fixtures/crm-test";
import { viewName } from "../fixtures/test-data";

test.describe.configure({ mode: "serial" });

const view = viewName();

test.describe("Journey 9: Saved Views — Admin", () => {
  test("view-01: admin sorts by name and saves the list as a view", async ({ lists, shell }) => {
    const people = lists("people");
    await people.goto();
    await people.sortBy("Name");
    await people.saveView(view);
    await expect(shell.toast(`View “${view}” saved`)).toBeVisible({ timeout: 20_000 });
    await expect(people.picker(view)).toBeVisible();
  });

  test("view-02: switching to All clears the sort and the view brings it back", async ({
    lists,
  }) => {
    const people = lists("people");
    await people.goto();
    await people.selectView(view);
    await expect(people.sort).toHaveText(/Name/, { timeout: 20_000 });
    await people.selectView("All", view);
    await expect(people.sort).toHaveText(/^\s*Sort\s*$/);
    await people.selectView(view);
    await expect(people.sort).toHaveText(/Name/);
  });

  test("view-03: a lifecycle filter is saved into the view", async ({ lists, shell }) => {
    const people = lists("people");
    await people.goto();
    await people.selectView(view);
    await people.addFilter("Lifecycle", "Lead");
    await people.updateView.click();
    await expect(shell.toast(`View “${view}” updated`)).toBeVisible({ timeout: 20_000 });
  });

  test("view-04: the Columns picker hides the job title column", async ({ lists }) => {
    const people = lists("people");
    await people.goto();
    await expect(people.main.getByRole("columnheader", { name: "Job title" })).toBeVisible({
      timeout: 30_000,
    });
    try {
      await people.toggleColumn("Job title", false);
      await expect(people.main.getByRole("columnheader", { name: "Job title" })).toHaveCount(0);
    } finally {
      await people.toggleColumn("Job title", true);
    }
  });

  test("view-05: Clear filters drops the filter chips", async ({ lists }) => {
    const people = lists("people");
    await people.goto();
    await people.selectView(view);
    await expect(people.main.getByRole("combobox", { name: "Lifecycle" })).toBeVisible({
      timeout: 20_000,
    });
    await people.clearFilters.click();
    await expect(people.main.getByRole("combobox", { name: "Lifecycle" })).toHaveCount(0);
  });

  test("view-06: admin deletes the view", async ({ lists, shell }) => {
    const people = lists("people");
    await people.goto();
    await people.selectView(view);
    await people.deleteView(view);
    await expect(shell.toast(`View “${view}” deleted`)).toBeVisible({ timeout: 20_000 });
    await expect(people.picker("All")).toBeVisible();
  });
});
