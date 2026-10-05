import { describe, expect, it } from "vitest";

import { MANAGE_CRM_FLAG, canManageCrm } from "../lib/crm/permissions";

describe("canManageCrm", () => {
  const granted = { "/platforms/acme/": { [MANAGE_CRM_FLAG]: true, can_manage_users: false } };
  const member = { isAdmin: false, adminMode: false };

  it("opens Settings to a CRM Manager who is not an org admin", () => {
    expect(canManageCrm(granted, "acme", member)).toBe(true);
  });

  it("stays closed without the flag or on another platform", () => {
    expect(
      canManageCrm({ "/platforms/acme/": { can_view_crm_pipelines: true } }, "acme", member),
    ).toBe(false);
    expect(canManageCrm(granted, "other", member)).toBe(false);
  });

  it("follows the switch for an org admin, who holds every flag", () => {
    expect(canManageCrm(granted, "acme", { isAdmin: true, adminMode: false })).toBe(false);
    expect(canManageCrm({}, "acme", { isAdmin: true, adminMode: true })).toBe(true);
  });
});
