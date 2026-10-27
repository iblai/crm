/**
 * Journey 3 — Command palette (⌘K)
 *
 * Opening, the Go to and Create groups, server search on a created person,
 * the empty result and Escape. Serial: pal-03 creates the person pal-04 finds.
 */
import { test, expect } from "../fixtures/crm-test";
import { personName } from "../fixtures/test-data";
import { esc } from "../utils/app";

test.describe.configure({ mode: "serial" });

const name = personName();

test.describe("Journey 3: Command Palette — Admin", () => {
  test.beforeEach(async ({ shell }) => {
    await shell.goto("");
  });

  test("pal-01: ⌘K opens the palette with the search focused", async ({ shell }) => {
    await shell.openPalette();
    await expect(shell.palette).toBeVisible();
    await expect(shell.paletteInput).toBeFocused();
  });

  test("pal-02: the Go to group reaches People", async ({ shell, page }) => {
    await shell.paletteGo("People");
    await expect(page).toHaveURL(/\/people$/);
    await expect(shell.heading("People")).toBeVisible({ timeout: 60_000 });
  });

  test("pal-03: the New person item opens the dialog, which creates the person", async ({
    shell,
    dialogs,
    page,
  }) => {
    await shell.paletteGo("New person");
    await expect(dialogs.person).toBeVisible();
    await expect(page).toHaveURL(/\/people(\?.*)?$/);
    await dialogs.createPerson({ name });
    await page.waitForURL(/\/people\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  });

  test("pal-04: typing a name finds the person through server search and opens it", async ({
    shell,
    page,
    record,
  }) => {
    await shell.openPalette();
    await shell.paletteInput.fill(name);
    await shell.paletteOption(new RegExp(esc(name))).click();
    await page.waitForURL(/\/people\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    await expect(record.title(name)).toBeVisible();
  });

  test("pal-05: a query that matches nothing lists no record groups", async ({ shell }) => {
    await shell.openPalette();
    await shell.paletteInput.fill("zzqx-no-such-record-7f3a");
    // The Create and Go to groups stay; a record group would be a hit.
    await expect(shell.paletteOption("New person")).toBeVisible();
    await shell.page.waitForTimeout(1_000);
    for (const group of ["People", "Organizations", "Deals"]) {
      await expect(shell.palette.locator("[cmdk-group-heading]", { hasText: group })).toHaveCount(
        0,
      );
    }
  });

  test("pal-06: Escape closes the palette", async ({ shell }) => {
    await shell.openPalette();
    await shell.page.keyboard.press("Escape");
    await expect(shell.paletteInput).toBeHidden();
  });
});
