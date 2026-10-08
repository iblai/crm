import config from "@/lib/iblai/config";

/** Only the Auth SPA's own origin is a valid `?to=` for the same-origin hop. */
export function isAuthSpaUrl(target: string, authUrl: string = config.authUrl()): boolean {
  try {
    return new URL(target).origin === new URL(authUrl).origin;
  } catch {
    return false;
  }
}

/**
 * ibl.ai registration — the free-plan checkout `ibl.ai/join` resolves to — told to
 * come back: the Auth SPA signs the new organization's admin in and lands on
 * `/sso-login-complete`; a cancelled checkout comes back the same way and lands on `/join`.
 */
export function createOrganizationUrl(origin: string, email = ""): string {
  const login = `${config.authUrl()}/login?app=${encodeURIComponent(config.iblPlatform())}`;
  const params = new URLSearchParams({
    redirect_url: `${login}&redirect-to=${encodeURIComponent(origin)}`,
    cancel_url: `${login}&redirect-to=${encodeURIComponent(`${origin}/join`)}`,
  });
  // Prefills (and locks) the Checkout email, so the new organization attaches to this account.
  if (email) params.set("email", email);
  return `${config.dmUrl()}/api/service/stripe/checkout/redirect/credits-free-plan/?${params}`;
}
