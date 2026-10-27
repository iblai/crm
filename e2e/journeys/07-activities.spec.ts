/**
 * Journey 7 — Activities
 *
 * A scheduled task from the dialog, the Activities page's sections and
 * filters, the dashboard's Up next, edit, done and delete. Serial on one
 * activity.
 */
import { test, expect } from "../fixtures/crm-test";
import { activityTitle, personName, tomorrowAtTen } from "../fixtures/test-data";

test.describe.configure({ mode: "serial" });

const person = personName();
const title = activityTitle();
const edited = `${title} edited`;

test.describe("Journey 7: Activities — Admin", () => {
  test("act-01: admin schedules a task for a person from the Activities page", async ({
    lists,
    dialogs,
    activities,
    page,
    shell,
  }) => {
    test.setTimeout(180_000);
    const people = lists("people");
    await people.goto();
    await people.newButton.click();
    await dialogs.createPerson({ name: person });
    await page.waitForURL(/\/people\/[0-9a-f-]{36}$/, { timeout: 30_000 });

    await activities.goto();
    await activities.newButton.click();
    await dialogs.createActivity({ title, person, startsAt: tomorrowAtTen() });
    await expect(shell.toast("Activity created")).toBeVisible({ timeout: 20_000 });
  });

  test("act-02: the task is listed under Upcoming for tomorrow", async ({ activities }) => {
    await activities.goto();
    await expect(activities.section("Upcoming").filter({ hasText: title })).toBeVisible({
      timeout: 30_000,
    });
    await expect(activities.row(title)).toContainText(/Tomorrow · /);
  });

  test("act-03: the owner scope switches between Mine and Everyone", async ({
    activities,
    page,
  }) => {
    await activities.goto();
    const everyone = page.waitForRequest(
      (r) => r.url().includes("/activities/") && !/[?&]owner=/.test(r.url()),
      { timeout: 20_000 },
    );
    await activities.setScope("Everyone");
    await everyone;
    await expect(activities.scope.getByRole("button", { name: "Everyone" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("act-04: the status filter asks for done, open or every activity", async ({
    activities,
    page,
  }) => {
    await activities.goto();
    const done = page.waitForRequest(
      (r) => r.url().includes("/activities/") && r.url().includes("is_done=true"),
      { timeout: 20_000 },
    );
    await activities.setStatus("Done");
    await done;
    const all = page.waitForRequest(
      (r) => r.url().includes("/activities/") && !r.url().includes("is_done="),
      { timeout: 20_000 },
    );
    await activities.setStatus("All");
    await all;
    // Open is the page's initial query, served again from the cache: assert the control.
    await activities.setStatus("Open");
    await expect(
      activities.status.getByRole("button", { name: "Open", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("act-05: the date range narrows the schedule window", async ({ activities, page }) => {
    await activities.goto();
    const ranged = page.waitForRequest(
      (r) =>
        r.url().includes("/activities/") &&
        r.url().includes("schedule_from__gte") &&
        r.url().includes("schedule_from__lte"),
      { timeout: 20_000 },
    );
    await activities.setRange("Next 7 days");
    await ranged;
  });

  test("act-06: the dashboard's Up next lists the task", async ({ home }) => {
    await home.goto();
    await expect(home.panel("Up next").getByText(title)).toBeVisible({ timeout: 60_000 });
  });

  test("act-07: the row's Edit button renames the task", async ({ activities, shell }) => {
    await activities.goto();
    await activities.edit(title, edited);
    await expect(shell.toast("Activity updated")).toBeVisible({ timeout: 20_000 });
    await expect(activities.row(edited)).toBeVisible();
  });

  test("act-08: Mark as done moves the task to the Done section", async ({ activities }) => {
    await activities.goto();
    await activities.markDone(edited);
    await expect(activities.section("Upcoming").filter({ hasText: edited })).toHaveCount(0, {
      timeout: 20_000,
    });
    await activities.setStatus("Done");
    await activities.doneToggle.click();
    await expect(
      activities.row(edited).getByRole("button", { name: "Mark as not done" }),
    ).toBeVisible({
      timeout: 20_000,
    });
  });

  test("act-09: admin deletes the task", async ({ activities, shell }) => {
    await activities.goto();
    await activities.setStatus("Done");
    await activities.doneToggle.click();
    await activities.remove(edited);
    await expect(shell.toast("Activity deleted")).toBeVisible({ timeout: 20_000 });
    await expect(activities.row(edited)).toHaveCount(0);
  });
});
