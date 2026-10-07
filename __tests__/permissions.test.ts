import { describe, expect, it } from "vitest";

import { MANAGE_CRM_FLAG, canManageCrm, needsOrganization } from "../lib/crm/permissions";

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

describe("needsOrganization", () => {
  const members = [{ key: "main", is_admin: false }];
  const noCrm = { "/platforms/main/": { can_manage_users: false, can_view_mentors: true } };

  it("is true for a member who is admin nowhere and holds no CRM flag here", () => {
    expect(needsOrganization(members, noCrm, "main")).toBe(true);
    expect(needsOrganization(members, { "/platforms/main/": {} }, "main")).toBe(true);
  });

  it("is false for an admin anywhere, or any CRM flag in this organization", () => {
    expect(needsOrganization([{ key: "acme", is_admin: true }, ...members], noCrm, "main")).toBe(
      false,
    );
    expect(
      needsOrganization(members, { "/platforms/main/": { can_view_crm_persons: true } }, "main"),
    ).toBe(false);
    expect(
      needsOrganization(members, { "/platforms/main/": { can_crm_invite: true } }, "main"),
    ).toBe(false);
  });

  it("is false while unknown: no organizations stored, or no flags for this platform", () => {
    expect(needsOrganization([], noCrm, "main")).toBe(false);
    expect(needsOrganization(members, {}, "main")).toBe(false);
    expect(needsOrganization(members, noCrm, "acme")).toBe(false);
  });
});
