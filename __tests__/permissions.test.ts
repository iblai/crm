import { describe, expect, it } from "vitest";

import { MANAGE_CRM_FLAG, canManageCrm, decideEntry } from "../lib/crm/permissions";

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

describe("decideEntry", () => {
  const member = { key: "acme", is_admin: false };
  const admin = { key: "globex", is_admin: true };
  const noView = { "/platforms/acme/": { can_write_crm_persons: true, can_crm_invite: true } };
  const view = { "/platforms/acme/": { can_view_crm_deals: true } };

  it("enters while unknown: no organizations stored, or no flags for this platform", () => {
    expect(decideEntry([], noView, "acme")).toBe("enter");
    expect(decideEntry([member], {}, "acme")).toBe("enter");
  });

  it("enters an organization the user administers, or whose data a view flag shows", () => {
    expect(decideEntry([{ key: "acme", is_admin: true }], { "/platforms/acme/": {} }, "acme")).toBe(
      "enter",
    );
    expect(decideEntry([member], view, "acme")).toBe("enter");
  });

  it("write and invite flags alone do not show data", () => {
    expect(decideEntry([member], noView, "acme")).not.toBe("enter");
  });

  it("switches back to the organization the user came from, even one they do not administer", () => {
    expect(decideEntry([member, { key: "initech" }], noView, "acme", "initech")).toEqual({
      switchTo: "initech",
    });
  });

  it("falls back to an organization they administer when the previous one is this one or unknown", () => {
    expect(decideEntry([member, admin], noView, "acme", "acme")).toEqual({ switchTo: "globex" });
    expect(decideEntry([member, admin], noView, "acme", "stale")).toEqual({ switchTo: "globex" });
    expect(decideEntry([member, admin], noView, "acme")).toEqual({ switchTo: "globex" });
  });

  it("sends a user with nowhere to go to registration", () => {
    expect(decideEntry([member], noView, "acme")).toBe("register");
    expect(decideEntry([member], noView, "acme", null)).toBe("register");
  });
});
