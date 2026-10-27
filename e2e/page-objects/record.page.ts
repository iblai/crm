import { expect, type Locator, type Page } from "@playwright/test";
import { confirm, dialog, esc, field, main, pickOption } from "../utils/app";

/**
 * A record page (person, organization, deal): the header actions, the field
 * panel's inline fields, the tabs, the timeline composer and the deal's
 * stage controls.
 */
export class RecordPage {
  readonly main: Locator;
  readonly favorite: Locator;
  readonly moreActions: Locator;
  readonly addPerson: Locator;
  readonly invite: Locator;
  readonly tabpanel: Locator;
  readonly composerType: Locator;
  readonly composerTitle: Locator;
  readonly stepper: Locator;
  readonly markWon: Locator;
  readonly markLost: Locator;
  readonly reopen: Locator;
  readonly deleteDeal: Locator;

  constructor(readonly page: Page) {
    this.main = main(page);
    this.favorite = this.main.getByRole("button", { name: /favorites$/ });
    this.moreActions = this.main.getByRole("button", { name: "More actions" }).first();
    this.addPerson = this.main.getByRole("button", { name: "Add person" }).first();
    this.invite = this.main.getByRole("button", { name: /^Invite to platform/ });
    this.tabpanel = page.getByRole("tabpanel");
    this.composerType = page.getByRole("combobox", { name: "Activity type" });
    this.composerTitle = page.getByRole("textbox", { name: "Activity title" });
    this.stepper = page.getByRole("navigation", { name: "Pipeline stage" });
    this.markWon = this.main.getByRole("button", { name: "Mark won", exact: true });
    this.markLost = this.main.getByRole("button", { name: "Mark lost", exact: true });
    this.reopen = this.main.getByRole("button", { name: "Reopen", exact: true });
    this.deleteDeal = this.main.getByRole("button", { name: "Delete deal", exact: true });
  }

  /** The record's name: an inline-editable button (record pages have no h1). */
  title(name: string): Locator {
    return this.main.getByRole("button", { name, exact: true }).first();
  }

  field(label: string): Locator {
    return field(this.page, label);
  }

  /** Click-to-edit a text field: open, type, Enter; the button then shows the value. */
  async editField(label: string, value: string) {
    const row = this.field(label);
    await row.locator("dd").getByRole("button").first().click();
    const box = row.getByRole("textbox");
    await box.fill(value);
    await box.press("Enter");
    await expect(row.locator("dd").getByRole("button").first()).toContainText(value);
  }

  /** The select of a field row (Lifecycle, Owner, …) — unnamed, so scoped by the row. */
  async selectField(label: string, option: string) {
    await this.field(label).getByRole("combobox").click();
    await pickOption(this.page, option);
  }

  /** Create a tag from the picker and attach it. */
  async addNewTag(name: string) {
    await this.field("Tags")
      .getByRole("button", { name: /^Add( tag)?$/ })
      .click();
    const box = this.page.getByPlaceholder("Find or create a tag…");
    await box.fill(name);
    await this.page.getByRole("option", { name: `Create “${name}”` }).click();
    await this.page.keyboard.press("Escape");
  }

  tagChip(name: string): Locator {
    return this.field("Tags").getByRole("button", { name: `Remove tag ${name}`, exact: true });
  }

  async tab(name: string) {
    await this.page.getByRole("tab", { name, exact: true }).click();
  }

  /** Log an activity from the timeline composer; Enter submits (the Add button clashes with the tag picker's). */
  async log(title: string, type?: string) {
    if (type) {
      await this.composerType.click();
      await pickOption(this.page, type);
    }
    await this.composerTitle.fill(title);
    await this.composerTitle.press("Enter");
  }

  /** A timeline entry holding the title. */
  timelineRow(title: string): Locator {
    return this.tabpanel.locator("li").filter({ hasText: title });
  }

  /** The timeline's h3 sections ("Open · n", "History · n"). */
  timelineSection(name: "Open" | "History"): Locator {
    return this.tabpanel
      .locator("section, div")
      .filter({ has: this.page.getByRole("heading", { level: 3, name: new RegExp(`^${name} ·`) }) })
      .first();
  }

  async menu(item: string) {
    await this.moreActions.click();
    await this.page.getByRole("menuitem", { name: item, exact: true }).click();
  }

  /** Delete the record: the menu item and the confirm button share the label. */
  async deleteRecord(label: string) {
    await this.menu(label);
    await confirm(this.page, label);
  }

  /** Merge a duplicate into this person. */
  async merge(duplicate: string) {
    await this.menu("Merge duplicates");
    const d = dialog(this.page, /^Merge duplicates into/);
    await d.getByRole("textbox", { name: "Search people to merge" }).fill(duplicate);
    // The label wraps the checkbox, so its name repeats the person's name after the aria-label.
    await d.getByRole("checkbox", { name: new RegExp(`^Merge ${esc(duplicate)}`) }).check();
    await d.getByRole("button", { name: /^Merge \d+ record/ }).click();
    await confirm(this.page, "Merge duplicates");
  }

  // ── deals ──────────────────────────────────────────────────────────────────

  stagePill(stage: string): Locator {
    return this.stepper.getByRole("button", {
      name: new RegExp(`^Move this deal to ${esc(stage)}`),
    });
  }

  currentStage(stage: string): Locator {
    return this.stepper.getByRole("button", { name: `This deal is in ${stage}`, exact: true });
  }

  /** Move an open deal to an open stage: the stepper moves at once, only won and reopen confirm. */
  async moveTo(stage: string) {
    await this.stagePill(stage).click();
  }

  async win() {
    await this.markWon.click();
    await confirm(this.page, "Mark won");
  }

  async lose(reason: string) {
    await this.markLost.click();
    const d = dialog(this.page, "Mark this deal lost?");
    await d.locator("#lost-reason").fill(reason);
    await d.getByRole("button", { name: "Mark lost", exact: true }).click();
  }

  /** Reopen a closed deal; it confirms with the stage dialog's "Move". */
  async reopenDeal() {
    await this.reopen.click();
    await confirm(this.page, "Move");
  }

  async removeDeal() {
    await this.deleteDeal.click();
    await confirm(this.page, "Delete");
  }
}
