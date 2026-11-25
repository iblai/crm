import { expect, type Locator, type Page } from "@playwright/test";
import { PAGES, SDK, SDK_LANGUAGE } from "../fixtures/test-data";
import {
  confirm,
  dialog,
  esc,
  gotoHome,
  heading,
  openSheet,
  platformUrl,
  toast,
} from "../utils/app";

/**
 * The shell: the SDK sidebar (rows, Favorites, footer), the top bar
 * (toggle, breadcrumb, Admin mode switch, credits, bell, profile) and ⌘K.
 */
export class Shell {
  readonly nav: Locator;
  readonly sidebar: Locator;
  readonly sheet: Locator;
  readonly toggleSidebar: Locator;
  readonly breadcrumb: Locator;
  readonly adminMode: Locator;
  readonly credits: Locator;
  readonly bell: Locator;
  readonly profile: Locator;
  readonly settings: Locator;
  readonly palette: Locator;
  readonly paletteInput: Locator;
  private org?: string;

  constructor(readonly page: Page) {
    // The SDK localizes the landmark's name with the UI language.
    this.nav = page.getByRole("navigation", { name: SDK.nav });
    this.sidebar = page.locator('[data-sidebar="sidebar"]').first();
    this.sheet = page.getByRole("dialog", { name: SDK.sheet });
    this.toggleSidebar = page.getByRole("button", { name: "Toggle sidebar" });
    this.breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    this.adminMode = page.getByRole("switch", { name: "Admin mode" });
    this.credits = page.getByTestId(SDK.credits);
    this.bell = page.getByRole("button", { name: /^\d+ Notifications?$/ });
    this.profile = page.getByRole("button", { name: SDK.profile });
    // The SDK account dialog every footer row opens, on that row's page.
    this.settings = page.getByRole("dialog", { name: SDK.settings, exact: true });
    this.palette = dialog(page, "Search");
    this.paletteInput = page.getByPlaceholder("Search people, organizations, deals…");
  }

  /** Open a page of the signed-in user's organization; returns the organization key. */
  async goto(path = ""): Promise<string> {
    if (!this.org) this.org = await gotoHome(this.page);
    const target = platformUrl(this.org, path);
    if (this.page.url().split(/[?#]/)[0].replace(/\/$/, "") !== target.replace(/\/$/, "")) {
      await this.page.goto(target);
    }
    const title = PAGES.find(([p]) => p === path.split(/[?#]/)[0])?.[1];
    if (title) await expect(this.heading(title)).toBeVisible({ timeout: 60_000 });
    else await expect(this.nav).toBeVisible({ timeout: 60_000 });
    return this.org;
  }

  /** The organization key, once `goto` has resolved it. */
  get orgKey(): string {
    if (!this.org) throw new Error("call shell.goto() first");
    return this.org;
  }

  heading(title: string): Locator {
    return heading(this.page, title);
  }

  /** A sidebar row — the rows are buttons; on a phone they live in the sheet. */
  navRow(label: string): Locator {
    return this.nav.getByRole("button", { name: label, exact: true });
  }

  async navigate(label: string) {
    await this.navRow(label).click();
  }

  /** A footer row (Notifications, Management, …) of the sidebar. */
  footer(label: string): Locator {
    return this.sidebar.getByRole("button", { name: label, exact: true });
  }

  toast(text: string | RegExp): Locator {
    return toast(this.page, text);
  }

  async confirm(label: string) {
    await confirm(this.page, label);
  }

  async openPalette() {
    await this.page.keyboard.press("ControlOrMeta+k");
    await expect(this.paletteInput).toBeVisible();
  }

  paletteOption(name: string | RegExp): Locator {
    return this.palette.getByRole("option", { name, exact: typeof name === "string" });
  }

  async paletteGo(label: string) {
    await this.openPalette();
    await this.paletteOption(label).click();
  }

  async setAdminMode(on: boolean) {
    await expect(this.adminMode).toBeVisible();
    if ((await this.adminMode.isChecked()) !== on) await this.adminMode.click();
    await expect(this.adminMode).toHaveAttribute("aria-checked", String(on));
  }

  /** Choose the language as a user does: profile menu → Profile → Language → Save Changes. */
  async setLanguage(code: keyof typeof SDK_LANGUAGE.option) {
    const { page } = this;
    await page.getByRole("button", { name: SDK_LANGUAGE.profile }).click();
    await page.getByRole("menuitem", { name: SDK_LANGUAGE.profileItem }).click();
    const profile = page.getByRole("dialog").filter({ has: page.locator("#language") });
    const language = profile.locator("#language");
    await expect(language).toBeEnabled({ timeout: 30_000 });
    await language.click();
    await page
      .getByRole("listbox")
      .getByRole("option", { name: SDK_LANGUAGE.option[code] })
      .click();
    await profile.getByRole("button", { name: SDK_LANGUAGE.save }).click();
    // The save refreshes the stored profile, which the app's language sync follows.
    await page.waitForFunction(
      (saved) =>
        JSON.parse(localStorage.getItem("user_metadata") ?? "{}")?.public_metadata?.language ===
        saved,
      code,
      { timeout: 30_000 },
    );
    await page.keyboard.press("Escape");
    await expect(profile).toHaveCount(0);
  }

  async openSheet() {
    await openSheet(this.page);
  }

  /** The breadcrumb's root link, which names the organization. */
  breadcrumbRoot(name: string | RegExp): Locator {
    return this.breadcrumb.getByRole("link", { name });
  }

  breadcrumbCurrent(): Locator {
    return this.breadcrumb.locator('[aria-current="page"]');
  }

  menuItem(name: string | RegExp): Locator {
    return this.page.getByRole("menuitem", { name, exact: typeof name === "string" });
  }

  static escape = esc;
}
