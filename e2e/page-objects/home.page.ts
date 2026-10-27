import { type Locator, type Page, type Request } from "@playwright/test";
import { esc, main, pickOption } from "../utils/app";
import type { Shell } from "./shell.page";

/** The home dashboard: period, header actions, stat cards and panels. */
export class HomePage {
  readonly main: Locator;
  readonly period: Locator;
  readonly newPerson: Locator;
  readonly logActivity: Locator;
  readonly newDeal: Locator;
  readonly openBoard: Locator;
  readonly onboarding: Locator;
  /** The info tips of the six stat cards, in order. */
  readonly stats = [
    "About open deals",
    "About pipeline value",
    "About weighted pipeline",
    /^About deals won · /,
    "About people",
    "About activities due today",
  ] as const;

  constructor(
    readonly page: Page,
    readonly shell: Shell,
  ) {
    this.main = main(page);
    this.period = page.getByRole("combobox", { name: "Period" });
    this.newPerson = this.main.getByRole("button", { name: "New person", exact: true });
    this.logActivity = this.main.getByRole("button", { name: "Log activity", exact: true });
    this.newDeal = this.main.getByRole("button", { name: "New deal", exact: true });
    this.openBoard = this.main.getByRole("link", { name: "Open board" });
    this.onboarding = this.main.getByRole("heading", { name: "Your CRM is ready" });
  }

  async goto() {
    await this.shell.goto("");
  }

  stat(name: string | RegExp): Locator {
    return this.main.getByRole("button", { name, exact: typeof name === "string" });
  }

  /** A dashboard panel by its h2 (the name may carry the info tip's label). */
  panel(title: string): Locator {
    return this.main.locator("section").filter({
      has: this.page.getByRole("heading", { level: 2, name: new RegExp(`^${esc(title)}`) }),
    });
  }

  /** Pick a period and return the overview request it issues. */
  async setPeriod(label: string, dateFilter: string): Promise<Request> {
    const request = this.page.waitForRequest(
      (r) => r.url().includes("/overview/") && r.url().includes(`date_filter=${dateFilter}`),
      { timeout: 20_000 },
    );
    await this.period.click();
    await pickOption(this.page, label);
    return request;
  }
}
