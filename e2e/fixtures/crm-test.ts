import fs from "node:fs";
import path from "node:path";
import { test as base, expect, type BrowserContext, type Page } from "@playwright/test";
import { ActivitiesPage } from "../page-objects/activities.page";
import { Dialogs } from "../page-objects/dialogs.page";
import { HomePage } from "../page-objects/home.page";
import { ListPage, type ListKind } from "../page-objects/list.page";
import { RecordPage } from "../page-objects/record.page";
import { SettingsPage } from "../page-objects/settings.page";
import { Shell } from "../page-objects/shell.page";

/**
 * The CRM's test, as the OS's `fixtures/mentor-test.ts`: every spec imports
 * `test` and `expect` from here. The default `page` is the signed-in admin;
 * `memberPage` is a separate context on the member's storage state.
 */
type Fixtures = {
  shell: Shell;
  lists: (kind: ListKind) => ListPage;
  record: RecordPage;
  dialogs: Dialogs;
  activities: ActivitiesPage;
  settings: SettingsPage;
  home: HomePage;
  memberPage: Page;
  safetyNet: void;
};

export const memberStateFile = (browserName: string) =>
  path.resolve(__dirname, `../../playwright/.auth/member-${browserName}.json`);

/** Nothing a journey does may reach the checkout or email a real invitation. */
export async function guard(context: BrowserContext) {
  await context.route("**/api/service/stripe/**", (route) => route.abort());
  await context.route(/\/persons\/[^/]+\/invite\/?(\?.*)?$/, (route) =>
    route.request().method() === "POST" ? route.abort() : route.continue(),
  );
}

export const test = base.extend<Fixtures>({
  safetyNet: [
    async ({ context }, use) => {
      await guard(context);
      await use();
    },
    { auto: true },
  ],
  shell: async ({ page }, use) => {
    await use(new Shell(page));
  },
  lists: async ({ page, shell }, use) => {
    await use((kind) => new ListPage(page, kind, shell));
  },
  record: async ({ page }, use) => {
    await use(new RecordPage(page));
  },
  dialogs: async ({ page }, use) => {
    await use(new Dialogs(page));
  },
  activities: async ({ page, shell }, use) => {
    await use(new ActivitiesPage(page, shell));
  },
  settings: async ({ page, shell }, use) => {
    await use(new SettingsPage(page, shell));
  },
  home: async ({ page, shell }, use) => {
    await use(new HomePage(page, shell));
  },
  memberPage: async ({ browser, browserName }, use) => {
    const file = memberStateFile(browserName);
    if (!fs.existsSync(file)) {
      throw new Error(
        `${file} is missing: pnpm e2e:accounts creates the member, then the setup project signs it in.`,
      );
    }
    const context = await browser.newContext({ storageState: file });
    await guard(context);
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };
