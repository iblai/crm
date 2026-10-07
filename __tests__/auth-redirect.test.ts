import { describe, expect, it } from "vitest";

import config from "../lib/iblai/config";
import { createOrganizationUrl, isAuthSpaUrl } from "../lib/iblai/auth-redirect";

describe("isAuthSpaUrl", () => {
  const auth = "https://login.iblai.app";

  it("accepts the Auth SPA's own origin, any path and query", () => {
    expect(isAuthSpaUrl("https://login.iblai.app/login?app=crm&tenant=acme", auth)).toBe(true);
  });

  it("refuses look-alike hosts, other schemes and relative paths", () => {
    expect(isAuthSpaUrl("https://login-iblai.evil.example/login", auth)).toBe(false);
    expect(isAuthSpaUrl("https://login.iblai.app.evil.example/", auth)).toBe(false);
    expect(isAuthSpaUrl("http://login.iblai.app/login", auth)).toBe(false);
    expect(isAuthSpaUrl(["javascript", "alert(1)"].join(":"), auth)).toBe(false);
    expect(isAuthSpaUrl("/login", auth)).toBe(false);
    expect(isAuthSpaUrl("", auth)).toBe(false);
  });
});

describe("createOrganizationUrl", () => {
  const origin = "https://crm.example.test";

  it("sends the DM checkout back through the Auth SPA login, and a cancel to /join", () => {
    const url = new URL(createOrganizationUrl(origin));
    expect(`${url.origin}${url.pathname}`).toBe(
      `${config.dmUrl()}/api/service/stripe/checkout/redirect/credits-free-plan/`,
    );
    const login = new URL(url.searchParams.get("redirect_url")!);
    expect(`${login.origin}${login.pathname}`).toBe(`${config.authUrl()}/login`);
    expect(login.searchParams.get("app")).toBe(config.iblPlatform());
    expect(login.searchParams.get("redirect-to")).toBe(origin);
    expect(url.searchParams.get("cancel_url")).toBe(`${origin}/join`);
  });

  it("encodes the login URL once more inside redirect_url", () => {
    expect(createOrganizationUrl(origin)).toContain("redirect-to%3Dhttps%253A%252F%252F");
  });
});
