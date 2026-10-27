import { expect, type Locator, type Page } from "@playwright/test";
import { confirm, esc, main } from "../utils/app";
import type { Shell } from "./shell.page";

/** Settings: the Pipelines / Lead sources / About tabs. */
export class SettingsPage {
  readonly main: Locator;
  readonly list: Locator;
  readonly newPipeline: Locator;
  readonly addStage: Locator;
  readonly makeDefault: Locator;
  readonly deletePipeline: Locator;
  readonly newLeadSource: Locator;
  readonly orgKey: Locator;
  readonly manageRoles: Locator;

  constructor(
    readonly page: Page,
    readonly shell: Shell,
  ) {
    this.main = main(page);
    this.list = this.main.locator("aside");
    this.newPipeline = this.main.getByRole("button", { name: "New pipeline", exact: true }).first();
    this.addStage = this.main.getByRole("button", { name: "Add stage", exact: true });
    this.makeDefault = this.main.getByRole("button", { name: "Make default", exact: true });
    this.deletePipeline = this.main.getByRole("button", { name: "Delete", exact: true });
    this.newLeadSource = this.main
      .getByRole("button", { name: "New lead source", exact: true })
      .first();
    this.orgKey = this.main
      .locator("dl > div")
      .filter({ hasText: "Organization key" })
      .locator("code");
    this.manageRoles = this.main.getByRole("button", { name: "Manage roles", exact: true });
  }

  async goto(tab?: "sources" | "about") {
    await this.shell.goto(`/settings${tab ? `?tab=${tab}` : ""}`);
  }

  tab(name: "Pipelines" | "Lead sources" | "About"): Locator {
    return this.page.getByRole("tab", { name, exact: true });
  }

  /** A pipeline in the list (the editor's name button shares the text, hence the aside). */
  pipeline(name: string): Locator {
    return this.list.getByRole("button", { name: new RegExp(`^${esc(name)}\\b`) });
  }

  async selectPipeline(name: string) {
    await this.pipeline(name).click();
    await expect(this.pipeline(name)).toHaveAttribute("aria-current", "true");
  }

  async deleteStage(name: string) {
    await this.main.getByRole("button", { name: `Delete stage ${name}`, exact: true }).click();
    await confirm(this.page, "Delete stage");
  }

  async removePipeline() {
    await this.deletePipeline.click();
    await confirm(this.page, "Delete pipeline");
  }

  async deleteLeadSource(name: string) {
    await this.main
      .getByRole("button", { name: `Delete lead source ${name}`, exact: true })
      .click();
    await confirm(this.page, "Delete");
  }
}
