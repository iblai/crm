/**
 * Journey 10 — Settings (admin)
 *
 * The three tabs, a pipeline with stages, the default pipeline (restored),
 * stage and pipeline deletion, a lead source, the About tab's organization
 * key, roles table and Manage roles. Serial on one pipeline.
 */
import { test, expect } from "../fixtures/crm-test";
import { pipelineName, SDK, sourceName } from "../fixtures/test-data";
import { checkAdminStatus } from "../utils/app";

test.describe.configure({ mode: "serial" });

const pipeline = pipelineName();
const source = sourceName();

test.describe("Journey 10: Settings — Admin", () => {
  test.beforeEach(async ({ shell, page }) => {
    const org = await shell.goto("");
    test.skip(!(await checkAdminStatus(page, org)), "Requires admin access");
  });

  test("set-01: the tabs switch with the ?tab= query", async ({ settings, page }) => {
    await settings.goto();
    await settings.tab("Lead sources").click();
    await expect(page).toHaveURL(/\/settings\?tab=sources$/);
    await settings.tab("About").click();
    await expect(page).toHaveURL(/\/settings\?tab=about$/);
    await settings.tab("Pipelines").click();
    await expect(page).toHaveURL(/\/settings$/);
  });

  test("set-02: admin creates a pipeline and adds two stages", async ({
    settings,
    dialogs,
    shell,
  }) => {
    await settings.goto();
    await settings.newPipeline.click();
    await dialogs.createPipeline(pipeline);
    await expect(shell.toast(`Pipeline “${pipeline}” created`)).toBeVisible({ timeout: 20_000 });
    await settings.selectPipeline(pipeline);
    for (const stage of ["Qualify", "Proposal"]) {
      await settings.addStage.click();
      await dialogs.addStage(stage);
      await expect(shell.toast("Stage added")).toBeVisible({ timeout: 20_000 });
      await expect(settings.main.getByText(stage, { exact: true })).toBeVisible();
    }
  });

  test("set-03: Make default marks the pipeline and the original is restored", async ({
    settings,
    shell,
  }) => {
    await settings.goto();
    const current = settings.list
      .getByRole("button")
      .filter({ has: settings.page.getByText("Default", { exact: true }) })
      .first();
    await expect(current).toBeVisible({ timeout: 30_000 });
    const original = (await current.locator("span span").first().innerText()).trim();
    try {
      await settings.selectPipeline(pipeline);
      await settings.makeDefault.click();
      await expect(shell.toast(`“${pipeline}” is now the default pipeline`)).toBeVisible({
        timeout: 20_000,
      });
      await expect(settings.pipeline(pipeline)).toContainText("Default");
    } finally {
      await settings.selectPipeline(original);
      await settings.makeDefault.click();
      await expect(shell.toast(`“${original}” is now the default pipeline`)).toBeVisible({
        timeout: 20_000,
      });
    }
  });

  test("set-04: admin deletes a stage", async ({ settings, shell }) => {
    await settings.goto();
    await settings.selectPipeline(pipeline);
    await settings.deleteStage("Proposal");
    await expect(shell.toast("Stage deleted")).toBeVisible({ timeout: 20_000 });
  });

  test("set-05: admin deletes the pipeline", async ({ settings, shell }) => {
    await settings.goto();
    await settings.selectPipeline(pipeline);
    await settings.removePipeline();
    await expect(shell.toast("Pipeline deleted")).toBeVisible({ timeout: 20_000 });
    await expect(settings.pipeline(pipeline)).toHaveCount(0);
  });

  test("set-06: admin creates and deletes a lead source", async ({ settings, dialogs, shell }) => {
    await settings.goto("sources");
    await settings.newLeadSource.click();
    await dialogs.createLeadSource(source);
    await expect(shell.toast(`Lead source “${source}” created`)).toBeVisible({ timeout: 20_000 });
    await settings.deleteLeadSource(source);
    await expect(shell.toast("Lead source deleted")).toBeVisible({ timeout: 20_000 });
  });

  test("set-07: About shows the organization key and the CRM roles, and Manage roles opens Management", async ({
    settings,
    shell,
    page,
  }) => {
    await settings.goto("about");
    await expect(settings.orgKey).toHaveText(shell.orgKey);
    for (const role of ["CRM Viewer", "CRM User", "CRM Manager", "CRM Inviter"]) {
      await expect(settings.main.getByRole("cell", { name: role, exact: true })).toBeVisible();
    }
    await settings.manageRoles.click();
    await expect(page.getByRole("dialog", { name: SDK.management })).toBeVisible({
      timeout: 30_000,
    });
    await page.keyboard.press("Escape");
  });
});
