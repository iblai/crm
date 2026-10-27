import { expect, type Locator, type Page } from "@playwright/test";
import { confirm, dialog, esc, main, pickOption } from "../utils/app";
import type { Shell } from "./shell.page";

/** The Activities page: the scope / status / range filters and the grouped rows. */
export class ActivitiesPage {
  readonly main: Locator;
  readonly newButton: Locator;
  readonly scope: Locator;
  readonly status: Locator;
  readonly type: Locator;
  readonly range: Locator;
  readonly doneToggle: Locator;

  constructor(
    readonly page: Page,
    readonly shell: Shell,
  ) {
    this.main = main(page);
    this.newButton = this.main.getByRole("button", { name: "New activity", exact: true }).first();
    this.scope = page.getByRole("group", { name: "Owner scope" });
    this.status = page.getByRole("group", { name: "Status" });
    this.type = page.getByRole("combobox", { name: "Activity type" });
    this.range = page.getByRole("combobox", { name: "Date range" });
    this.doneToggle = this.main.getByRole("button", { name: /^Done \d+$/ });
  }

  async goto() {
    await this.shell.goto("/activities");
  }

  /** A section by its heading ("Upcoming", "Unscheduled", …; the name carries a count and a tip). */
  section(name: "Overdue" | "Today" | "Upcoming" | "Unscheduled"): Locator {
    return this.main
      .locator("section")
      .filter({ has: this.page.getByRole("heading", { name: new RegExp(`^${esc(name)}\\b`) }) });
  }

  /** A row on this page: the wrapper that holds the activity and its Edit button. */
  row(title: string): Locator {
    return this.main.locator('[class*="group/row"]').filter({ hasText: title });
  }

  async setScope(label: "Mine" | "Everyone") {
    await this.scope.getByRole("button", { name: label, exact: true }).click();
  }

  async setStatus(label: "Open" | "Done" | "All") {
    await this.status.getByRole("button", { name: label, exact: true }).click();
  }

  async setRange(label: string) {
    await this.range.click();
    await pickOption(this.page, label);
  }

  async markDone(title: string) {
    await this.row(title).getByRole("button", { name: "Mark as done", exact: true }).click();
  }

  /** The row's Edit button sits beside the item and shows on hover. */
  async edit(title: string, next: string) {
    const row = this.row(title);
    await row.hover();
    await row.getByRole("button", { name: "Edit", exact: true }).click({ force: true });
    const d = dialog(this.page, "Edit activity");
    await expect(d).toBeVisible();
    await d.locator("#activity-title").fill(next);
    await d.getByRole("button", { name: "Save changes" }).click();
  }

  async remove(title: string) {
    await this.row(title).getByRole("button", { name: "More actions" }).click();
    await this.shell.menuItem("Delete").click();
    await confirm(this.page, "Delete");
  }
}
