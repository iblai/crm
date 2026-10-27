/**
 * Journey 15 — Error and not-found states
 *
 * Unknown records, an unknown deal id, a failing list and a refused write.
 * Record 404s log a console error by design; journey 16 excludes them.
 */
import { test, expect } from "../fixtures/crm-test";
import { platformUrl } from "../utils/app";

test.describe("Journey 15: Error States — Admin", () => {
  test("err-01: an unknown person shows the not-found state", async ({ shell, page, record }) => {
    const org = await shell.goto("");
    await page.goto(platformUrl(org, `/people/${crypto.randomUUID()}`));
    await expect(record.main.getByText("This person no longer exists")).toBeVisible({
      timeout: 30_000,
    });
    await expect(record.main.getByRole("button", { name: "Back to People" })).toBeVisible();
    await expect(shell.breadcrumbCurrent()).toHaveText("Person");
  });

  test("err-02: an unknown organization shows the not-found state", async ({
    shell,
    page,
    record,
  }) => {
    const org = await shell.goto("");
    await page.goto(platformUrl(org, `/organizations/${crypto.randomUUID()}`));
    await expect(record.main.getByText("This organization no longer exists")).toBeVisible({
      timeout: 30_000,
    });
    await expect(record.main.getByRole("button", { name: "Back to Organizations" })).toBeVisible();
    await expect(shell.breadcrumbCurrent()).toHaveText("Organization");
  });

  test("err-03: an unknown deal shows Deal not found", async ({ shell, page, record }) => {
    const org = await shell.goto("");
    for (const id of ["999999999", "abc"]) {
      await page.goto(platformUrl(org, `/deals/${id}`));
      await expect(record.main.getByText("Deal not found")).toBeVisible({ timeout: 30_000 });
      await expect(record.main.getByRole("button", { name: "Back to deals" })).toBeVisible();
    }
  });

  test("err-04: a failing list and a refused write surface their messages", async ({
    shell,
    page,
    lists,
    dialogs,
  }) => {
    const org = await shell.goto("");
    await page.route(/\/api\/crm\/persons\/\?/, (route) =>
      route.fulfill({ status: 500, json: { detail: "E2E boom" } }),
    );
    await page.goto(platformUrl(org, "/people"));
    await expect(page.getByText("Couldn’t load this")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("E2E boom")).toBeVisible();
    await page.unroute(/\/api\/crm\/persons\/\?/);

    await page.route(/\/api\/crm\/persons\/$/, (route) =>
      route.request().method() === "POST"
        ? route.fulfill({ status: 403, json: { detail: "forbidden" } })
        : route.continue(),
    );
    const people = lists("people");
    await people.goto();
    await people.newButton.click();
    await dialogs.createPerson({ name: "E2E Person refused" });
    await expect(shell.toast("You don’t have permission to do that")).toBeVisible({
      timeout: 20_000,
    });
  });
});
