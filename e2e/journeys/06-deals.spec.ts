/**
 * Journey 6 — Deals
 *
 * A deal from the dialog, the board (card, move through the card menu, the
 * table layout), the deal page's status machine (stepper, lost, reopen, won),
 * its Activity and History tabs, the board's owner filter and deletion.
 * Serial: every test works on the deal deal-01 creates. The organization's
 * seeded default pipeline supplies the stages.
 */
import { test, expect } from "../fixtures/crm-test";
import { activityTitle, dealTitle, personName } from "../fixtures/test-data";
import { esc } from "../utils/app";

test.describe.configure({ mode: "serial" });

const person = personName();
const title = dealTitle();
let dealUrl = "";
let stages: string[] = [];

test.describe("Journey 6: Deals — Admin", () => {
  test("deal-01: admin creates a deal for a person from the Deals page", async ({
    lists,
    dialogs,
    page,
    shell,
  }) => {
    test.setTimeout(180_000);
    const people = lists("people");
    await people.goto();
    await people.newButton.click();
    await dialogs.createPerson({ name: person });
    await page.waitForURL(/\/people\/[0-9a-f-]{36}$/, { timeout: 30_000 });

    const deals = lists("deals");
    await deals.goto();
    await deals.newButton.click();
    await dialogs.createDeal({ title, person });
    await page.waitForURL(/\/deals\/\d+$/, { timeout: 30_000 });
    dealUrl = page.url();
    await expect(shell.toast(`Deal “${title}” created`)).toBeVisible({ timeout: 20_000 });
  });

  test("deal-02: the board shows the new deal in the first stage", async ({ lists }) => {
    const deals = lists("deals");
    await deals.goto();
    await deals.searchFor(title);
    await expect(deals.stages().first()).toBeVisible({ timeout: 60_000 });
    stages = (await deals
      .stages()
      .evaluateAll((els) =>
        els.map((el) => (el.getAttribute("aria-label") ?? "").replace(/ stage$/, "")),
      )) as string[];
    expect(stages.length, "the default pipeline has stages").toBeGreaterThan(1);
    await expect(
      deals
        .stages()
        .first()
        .getByRole("button", { name: new RegExp(esc(title)) }),
    ).toBeVisible();
  });

  test("deal-03: the card's menu moves the deal to the next stage", async ({ lists }) => {
    const deals = lists("deals");
    await deals.goto();
    await deals.searchFor(title);
    await expect(deals.card(title).first()).toBeVisible({ timeout: 60_000 });
    await deals.moveCard(title, stages[1]);
    await expect(
      deals.stage(stages[1]).getByRole("button", { name: new RegExp(esc(title)) }),
    ).toBeVisible({
      timeout: 20_000,
    });
  });

  test("deal-04: the Table layout lists the deal and the choice survives a reload", async ({
    lists,
    page,
  }) => {
    const deals = lists("deals");
    await deals.goto();
    try {
      await deals.table.click();
      await expect(deals.table).toHaveAttribute("aria-pressed", "true");
      await deals.searchFor(title);
      await expect(deals.row(title).first()).toBeVisible({ timeout: 30_000 });
      expect(await page.evaluate(() => localStorage.getItem("crm.deals.view"))).toBe("table");
      await page.reload();
      await expect(deals.table).toHaveAttribute("aria-pressed", "true", { timeout: 60_000 });
    } finally {
      await deals.board.click();
      await expect(deals.board).toHaveAttribute("aria-pressed", "true");
    }
  });

  test("deal-05: the deal page moves, loses, reopens and wins the deal", async ({
    page,
    record,
    shell,
  }) => {
    test.setTimeout(180_000);
    await page.goto(dealUrl);
    await expect(record.stepper).toBeVisible({ timeout: 60_000 });
    await record.moveTo(stages[0]);
    await expect(shell.toast(`Moved to ${stages[0]}`)).toBeVisible({ timeout: 20_000 });
    await expect(record.currentStage(stages[0])).toBeVisible();

    await record.lose("Price");
    await expect(shell.toast("Deal marked lost")).toBeVisible({ timeout: 20_000 });
    await expect(record.main.getByText("Closed lost")).toBeVisible();

    await record.reopenDeal();
    await expect(shell.toast("Deal reopened")).toBeVisible({ timeout: 20_000 });
    await expect(record.markWon).toBeVisible();

    await record.win();
    await expect(shell.toast("Deal won 🎉")).toBeVisible({ timeout: 20_000 });
    await expect(record.main.getByText("Closed won")).toBeVisible();
  });

  test("deal-06: the Activity tab logs a call on the deal", async ({ page, record, shell }) => {
    const call = activityTitle();
    await page.goto(dealUrl);
    await record.tab("Activity");
    await record.log(call, "Call");
    await expect(shell.toast("Activity logged")).toBeVisible({ timeout: 20_000 });
    await expect(record.timelineRow(call)).toBeVisible();
  });

  test("deal-07: the History tab records the stage changes", async ({ page, record }) => {
    await page.goto(dealUrl);
    await record.tab("History");
    await expect(record.tabpanel.getByText("Stage", { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test("deal-08: the board's owner filter narrows the request", async ({ lists, page }) => {
    const deals = lists("deals");
    await deals.goto();
    await expect(deals.stages().first()).toBeVisible({ timeout: 60_000 });
    const request = page.waitForRequest(
      (r) => r.url().includes("/deals/board/") && /[?&]owner=/.test(r.url()),
      { timeout: 20_000 },
    );
    await deals.filter.click();
    await deals.shell.menuItem("Owner").click();
    await deals.main.getByRole("combobox", { name: "Owner" }).click();
    // The listbox's first option is the empty "Unassigned", which sends no owner; pick a member.
    // (The language select's native options are in the DOM too: only the open listbox counts.)
    await page.getByRole("listbox").getByRole("option", { name: /E2E/ }).first().click();
    await request;
  });

  test("deal-09: admin deletes the deal", async ({ page, record, shell }) => {
    await page.goto(dealUrl);
    await expect(record.deleteDeal).toBeVisible({ timeout: 60_000 });
    await record.removeDeal();
    await expect(shell.toast("Deal deleted")).toBeVisible({ timeout: 20_000 });
    await page.waitForURL(/\/deals$/, { timeout: 30_000 });
  });
});
