import { expect, type Locator, type Page } from "@playwright/test";
import { esc, main, pickOption } from "../utils/app";
import type { Shell } from "./shell.page";

export type ListKind = "people" | "organizations" | "deals" | "tags";

const TITLE: Record<ListKind, string> = {
  people: "People",
  organizations: "Organizations",
  deals: "Deals",
  tags: "Tags",
};
const SEARCH: Record<ListKind, string> = {
  people: "Search people",
  organizations: "Search organizations",
  deals: "Search deals by title",
  tags: "Search tags",
};
const NEW: Record<ListKind, string> = {
  people: "New person",
  organizations: "New organization",
  deals: "New deal",
  tags: "New tag",
};

/** A list page: search, rows, the New button, the view bar; the deals board and the tag cards. */
export class ListPage {
  readonly main: Locator;
  readonly newButton: Locator;
  readonly search: Locator;
  readonly rows: Locator;
  readonly pagination: Locator;
  readonly filter: Locator;
  readonly sort: Locator;
  readonly columns: Locator;
  readonly saveAsNew: Locator;
  readonly updateView: Locator;
  readonly viewName: Locator;
  readonly clearFilters: Locator;
  readonly table: Locator;
  readonly board: Locator;

  constructor(
    readonly page: Page,
    readonly kind: ListKind,
    readonly shell: Shell,
  ) {
    this.main = main(page);
    this.newButton = this.main.getByRole("button", { name: NEW[kind], exact: true }).first();
    this.search = page.getByRole("textbox", { name: SEARCH[kind] });
    this.rows = this.main.getByRole("row");
    this.pagination = this.main.getByText(/^\d+–\d+ of \d+ /);
    this.filter = this.main.getByRole("button", { name: "Filter", exact: true });
    this.sort = this.main.getByRole("button", { name: /^Sort/ });
    this.columns = this.main.getByRole("button", { name: "Columns", exact: true });
    this.saveAsNew = this.main.getByRole("button", { name: "Save as new view" });
    this.updateView = this.main.getByRole("button", { name: "Update view" });
    this.viewName = page.getByRole("textbox", { name: "View name" });
    this.clearFilters = this.main.getByRole("button", { name: "Clear filters" });
    this.table = this.main.getByRole("button", { name: "Table", exact: true });
    this.board = this.main.getByRole("button", { name: "Board", exact: true });
  }

  async goto() {
    await this.shell.goto(`/${this.kind}`);
    await expect(this.shell.heading(TITLE[this.kind])).toBeVisible();
  }

  async searchFor(query: string) {
    await this.search.fill(query);
  }

  /** A table row holding the text (people, organizations, the deals table). */
  row(text: string): Locator {
    return this.rows.filter({ hasText: text });
  }

  async open(text: string) {
    await this.row(text).first().click();
  }

  /** The view picker button: the saved view's name, or "All". */
  picker(name = "All"): Locator {
    return this.main.getByRole("button", { name: new RegExp(`^${esc(name)}`) });
  }

  async sortBy(field: string) {
    await this.sort.click();
    await this.shell.menuItem(new RegExp(`^${esc(field)}`)).click();
  }

  /** Add a filter chip and pick its value; the chip's value control is named after the field. */
  async addFilter(field: string, option: string | RegExp) {
    await this.filter.click();
    await this.shell.menuItem(field).click();
    await this.main.getByRole("combobox", { name: field }).click();
    await pickOption(this.page, option);
  }

  async toggleColumn(label: string, on: boolean) {
    await this.columns.click();
    await this.page.getByRole("checkbox", { name: label }).setChecked(on);
    await this.page.keyboard.press("Escape");
  }

  async saveView(name: string) {
    await this.saveAsNew.click();
    await this.viewName.fill(name);
    await this.viewName.press("Enter");
  }

  async selectView(name: string, from = "All") {
    await this.picker(from).click();
    await this.shell.menuItem(name).click();
  }

  async deleteView(name: string) {
    await this.picker(name).click();
    await this.shell.menuItem("Delete view").click();
  }

  // ── the deals board ────────────────────────────────────────────────────────

  /** A board column, a region named "<stage> stage". */
  stage(name: string): Locator {
    return this.main.getByRole("region", { name: `${name} stage`, exact: true });
  }

  stages(): Locator {
    return this.main.getByRole("region", { name: / stage$/ });
  }

  /** A card: a button whose name is the card's whole text. */
  card(title: string): Locator {
    return this.main.getByRole("button", { name: new RegExp(esc(title)) });
  }

  /** Move a card through its menu (the button shows on hover, dragging is not needed). */
  async moveCard(title: string, stage: string) {
    const card = this.card(title).first();
    await card.hover();
    await card
      .locator("xpath=..")
      .getByRole("button", { name: "Move deal to another stage" })
      .click({ force: true });
    await this.shell.menuItem(stage).click();
  }

  // ── the tag cards ──────────────────────────────────────────────────────────

  /** The tag card's handle: its delete button, named after the tag. */
  tagDelete(name: string): Locator {
    return this.main.getByRole("button", { name: `Delete tag ${name}`, exact: true });
  }

  tagColor(name: string): Locator {
    return this.main.getByRole("button", { name: `Change the color of ${name}`, exact: true });
  }

  async recolorTag(name: string, hex: string) {
    await this.tagColor(name).click();
    await this.page.getByRole("button", { name: `Use color ${hex}`, exact: true }).click();
    await this.page.keyboard.press("Escape");
  }
}
