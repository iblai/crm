import { expect, type Locator, type Page } from "@playwright/test";
import { dialog, esc, pickOption } from "../utils/app";

/** The create dialogs: person, organization, deal, activity, tag, pipeline, stage, lead source. */
export class Dialogs {
  readonly person: Locator;
  readonly organization: Locator;
  readonly deal: Locator;
  readonly activity: Locator;
  readonly tag: Locator;
  readonly pipeline: Locator;
  readonly stage: Locator;
  readonly leadSource: Locator;
  readonly lost: Locator;
  readonly linkUser: Locator;

  constructor(readonly page: Page) {
    this.person = dialog(page, "New person");
    this.organization = dialog(page, "New organization");
    this.deal = dialog(page, "New deal");
    this.activity = dialog(page, /^(New|Edit) activity$/);
    this.tag = dialog(page, "New tag");
    this.pipeline = dialog(page, "New pipeline");
    this.stage = dialog(page, "Add stage");
    this.leadSource = dialog(page, "New lead source");
    this.lost = dialog(page, "Mark this deal lost?");
    this.linkUser = dialog(page, "Link to a platform user");
  }

  /** A search picker: the trigger shows its placeholder, the popover searches the server. */
  async pick(scope: Locator, trigger: string | RegExp, query: string, option = query) {
    await scope.getByRole("button", { name: trigger }).click();
    const box = this.page.getByPlaceholder("Type to search…");
    await box.fill(query);
    // The row's name starts with the avatar's initials, so the option is matched anywhere.
    await this.page
      .getByRole("option", { name: new RegExp(esc(option)) })
      .first()
      .click();
  }

  async createPerson({
    name,
    email,
    jobTitle,
  }: {
    name: string;
    email?: string;
    jobTitle?: string;
  }) {
    const d = this.person;
    await expect(d).toBeVisible();
    await d.locator("#person-name").fill(name);
    if (email) await d.locator("#person-email").fill(email);
    if (jobTitle) await d.locator("#person-title").fill(jobTitle);
    await d.getByRole("button", { name: "Create person" }).click();
  }

  async createOrganization({ name, street }: { name: string; street?: string }) {
    const d = this.organization;
    await expect(d).toBeVisible();
    await d.locator("#org-name").fill(name);
    if (street) await d.locator("#org-street").fill(street);
    await d.getByRole("button", { name: "Create organization" }).click();
  }

  /** `person` is searched for in the picker; omit it when the dialog opened from a person. */
  async createDeal({ title, person }: { title: string; person?: string }) {
    const d = this.deal;
    await expect(d).toBeVisible();
    await d.locator("#deal-title").fill(title);
    if (person) await this.pick(d, "Search for a person…", person);
    await d.getByRole("button", { name: "Create deal" }).click();
  }

  async createActivity({
    title,
    person,
    startsAt,
  }: {
    title: string;
    person: string;
    startsAt?: string;
  }) {
    const d = this.activity;
    await expect(d).toBeVisible();
    await d.locator("#activity-title").fill(title);
    await this.pick(d, "No person", person);
    if (startsAt) await d.locator("#activity-from").fill(startsAt);
    await d.getByRole("button", { name: "Create activity" }).click();
  }

  async createTag(name: string) {
    const d = this.tag;
    await expect(d).toBeVisible();
    await d.locator("#tag-name").fill(name);
    await d.getByRole("button", { name: "Create tag" }).click();
  }

  async createPipeline(name: string) {
    const d = this.pipeline;
    await expect(d).toBeVisible();
    await d.locator("#pipeline-name").fill(name);
    await d.getByRole("button", { name: "Create pipeline" }).click();
  }

  /** The stage dialog: page button, title and submit all read "Add stage". */
  async addStage(name: string, outcome?: "In flight" | "Won" | "Lost") {
    const d = this.stage;
    await expect(d).toBeVisible();
    await d.locator("#stage-name").fill(name);
    if (outcome) {
      await d.getByRole("combobox", { name: "Stage outcome" }).click();
      await pickOption(this.page, outcome);
    }
    await d.getByRole("button", { name: "Add stage", exact: true }).click();
  }

  async createLeadSource(name: string) {
    const d = this.leadSource;
    await expect(d).toBeVisible();
    await d.locator("#source-name").fill(name);
    await d.getByRole("button", { name: "Create", exact: true }).click();
  }
}
