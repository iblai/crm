import { describe, expect, it } from "vitest";

import { MANAGE_CRM_FLAG, canManageCrm } from "../lib/crm/permissions";

describe("canManageCrm", () => {
  const granted = { "/platforms/acme/": { [MANAGE_CRM_FLAG]: true, can_manage_users: false } };

  it("opens Settings to a CRM Manager outside admin mode", () => {
    expect(canManageCrm(granted, "acme", false)).toBe(true);
  });

  it("stays closed without the flag or on another platform, and open in admin mode", () => {
    expect(
      canManageCrm({ "/platforms/acme/": { can_view_crm_pipelines: true } }, "acme", false),
    ).toBe(false);
    expect(canManageCrm(granted, "other", false)).toBe(false);
    expect(canManageCrm({}, "acme", true)).toBe(true);
  });
});
