# Development Guide

## Prerequisites

- Node.js 22+ (25.x works; the `dev` script disables Node's experimental web storage)
- pnpm 12 — `corepack enable` installs the version pinned in `package.json`
- An ibl.ai account — [ibl.ai/join](https://ibl.ai/join). Without an organization of your own the app sends you to registration and back (see below)
- For native builds: the Rust toolchain ([rustup](https://rustup.rs)); Xcode for iOS; Android Studio + NDK for Android

## Run

```bash
pnpm install --ignore-scripts
pnpm dev
```

`/` signs you in through the Auth SPA (`app=crm`: CRM copy, Sign Up goes to
registration and back); after sign-in you land on `/platform/<org>`. `http://localhost:3000` must be an allowed redirect origin
of the organization you sign in to (it is for ibl.ai's own organizations; ask
your operator otherwise).

## Environment

Nothing is required against hosted `iblai.app`. Copy `.env.example` to
`.env.local` to override the service URLs (self-hosting) or the community org.
`iblai.env` holds the platform shorthand used by the vibe skills
(`DOMAIN`, `PLATFORM`, `TOKEN`) — it is gitignored.

## How sign-in and organizations work

1. `providers/iblai-providers.tsx` initializes the SDK data layer and mounts
   `AuthProvider` → `TenantProvider`.
2. `AuthProvider` checks for a non-expired `dm_token`; without one it calls
   `redirectToAuthSpa()` (`lib/iblai/auth-utils.ts`) which goes through
   `/api/auth-redirect` to `login.<domain>/login?app=crm&redirect-to=<origin>`, adding
   `&tenant=<org>` only when the URL or the session names one — otherwise the Auth SPA
   picks the user's current organization.
3. The Auth SPA returns to `/sso-login-complete?data=…`; the SDK's `SsoLogin`
   stores `axd_token`, `dm_token`, `userData`, `current_tenant` (the organization
   list comes later, from `TenantProvider`).
   `lib/iblai/sso-redirect.ts` sanitizes the landing path and resets it to `/`
   when it names another organization.
4. `/` resolves the session's org (`lib/iblai/tenant.ts#resolveDefaultTenant`)
   and goes to `/platform/<org>`.
5. `TenantProvider` gets `requestedTenant` from the route and `currentTenant`
   from storage. When they differ it re-authenticates against the requested
   org and hands back a fresh org-scoped token pair (`saveUserTokens`).
6. Switching orgs (the SDK profile dropdown) calls the SDK's
   `handleTenantSwitch`, which clears storage, broadcasts to other tabs and
   re-enters the Auth SPA with `tenant=<new>`.
7. A user who administers no organization and holds no CRM permission in the one
   being entered is sent to ibl.ai registration (`lib/iblai/auth-redirect.ts#createOrganizationUrl`,
   the DM free-plan checkout `ibl.ai/join` resolves to) with a return through the
   Auth SPA, which signs them in to the organization it created; the signed-in
   email is passed along so Checkout prefills it (once the DM accepts `email`). Cancelling lands
   on `/join`, back through the Auth SPA as well — both return URLs sit on the Auth SPA, so
   the app's own host needs no entry on the DM's checkout redirect allowlist.
   A user who switches to an organization whose CRM data they cannot see (not its
   admin, no `can_view_crm_*` flag) is switched back to the one they came from, or
   to one they administer, with a toast saying so.

The CRM API (`lib/crm/api.ts`) sends `Authorization: Token <dm_token>` to
`https://api.iblai.app/dm/api/crm/…`; the platform infers the organization
from that token.

## Roles

Four roles are seeded per organization: **CRM Viewer**, **CRM User**,
**CRM Manager**, **CRM Inviter**. Assign them on `/platform/<org>/admin/users`
(the SDK's Management surface, Roles + Policies tabs). Organization admins
hold every permission. The app shows every affordance and surfaces a
permission error from the API as a toast; `/admin/*` is for organization
admins in Admin mode, and `/settings` opens to them and to CRM Managers (the
DM's `can_write_crm_pipelines` flag).

## Project layout

See the [Architecture](../README.md#architecture) section of the README.
Shared record widgets live in `components/crm/` (tag picker, owner select,
inline fields, activity timeline, confirm dialog, badges, avatars); module
components live under `components/crm/<module>/`.

## Languages

The UI is in English, Spanish, French and Chinese. The active language comes
from the shared `openedx-language-preference` cookie (set by any ibl.ai app),
then this app's `NEXT_LOCALE` cookie, then English; the top bar has a selector
that writes both. Strings live in `messages/{en,es,fr,zh}.json`;
`pnpm i18n:check` fails when the four files disagree, when a value says “tenant” or
“company”, or when it uses an ASCII apostrophe instead of `’`.

## Verify a change

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm i18n:check && pnpm test:coverage && pnpm build
```

`pnpm lint` runs under a warning budget (`--max-warnings` in `package.json`): fix a
warning, lower the number; never raise it. `pnpm test:coverage` holds the pure modules
under `lib/` at 85 % lines (`vitest.config.ts`).

Then open the page you touched and take a screenshot for the PR.
`pnpm screenshots` regenerates the README captures in `docs/images/` from the
Playwright session (`pnpm exec playwright test --config e2e/playwright.config.ts --project=setup-chromium` once,
with your credentials in `e2e/.env.development`).

## Release

The first public release, `v1.0.0`, is published by hand: tag main and create the GitHub Release with the CHANGELOG's 1.0.0 section as its notes. From then on every push to main runs `.github/workflows/release.yml`: [release-it](https://github.com/release-it/release-it) reads the conventional commit subjects since the last `v*` tag, bumps `package.json` (`fix` → patch, `feat` → minor, a breaking change — `!` or `BREAKING CHANGE` — → major), prepends the entry to `CHANGELOG.md`, commits `chore(release): v<version>`, tags `v<version>` and publishes the GitHub Release — as `github-actions[bot]`, so the release commit triggers no other workflow. The workflow refuses to run while no `v*` tag exists. `pnpm release` runs the same locally (a `GITHUB_TOKEN` with `repo` scope in the environment). Native builds are a separate, manual step — see [DOWNLOADS.md](DOWNLOADS.md).

## Native shell

```bash
pnpm tauri dev            # desktop, loads the URL in src-tauri/tauri.conf.json
pnpm tauri build          # installer for this platform
pnpm tauri ios init && pnpm tauri ios dev "iPhone 16 Pro"
pnpm tauri android init && pnpm tauri android dev
```

The shell loads the hosted app (`devUrl` / `frontendDist` in
`src-tauri/tauri.conf.json`, `https://crm.ibl.ai`). Point it at a local server
by editing those two values (`http://localhost:3000`). OAuth providers open in
the system browser (macOS / iOS: `ASWebAuthenticationSession`; Windows/Linux:
a popup window); the deep link `iblai-crm://mobile-sso-login?data=…` finishes
the sign-in on mobile.
