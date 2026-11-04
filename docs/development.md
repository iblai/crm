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
4. `/` resolves the session's org (`lib/iblai/tenant.ts#pickLandingTenant`)
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
**CRM Manager**, **CRM Inviter**. Assign them from the sidebar footer's
Management (the SDK's Management dialog, Roles + Policies tabs). Organization
admins hold every permission. The app shows every affordance and surfaces a
permission error from the API as a toast; `/settings` opens to organization
admins in Admin mode and to CRM Managers (the DM's `can_write_crm_pipelines`
flag).

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
Playwright session (`pnpm e2e:accounts`, then
`pnpm exec playwright test --config e2e/playwright.config.ts --project=setup-chromium` once).

## E2E journeys

The Playwright suite (`e2e/`, see [its README](../e2e/README.md)) has the OS's shape:
numbered journeys, page objects, a coverage registry with a checker, two signed-in
accounts. The accounts live in a **throwaway organization, never `main`**: run
`/iblai-vibe-connect` from an empty directory with `--origin http://localhost:3000`
(from this root it would rewrite `NEXT_PUBLIC_MAIN_TENANT_KEY`), pick the organization
on the connect page, move its `iblai.env` here, then `pnpm e2e:accounts` once and
`pnpm test:e2e` against `pnpm dev`. The member account holds the CRM User role, which
the accounts script grants: without it the CRM sends a member to registration. Every
record the journeys create is `E2E`-prefixed and `e2e/utils/residue.ts` deletes them
when the run ends. `pnpm e2e:coverage` fails on a page no journey names and on a
checkpoint id that is in `e2e/coverage.json` but heads no test, or the reverse.

## Release

The first public release, `v1.0.0`, is published by hand: tag main and create the GitHub Release with the CHANGELOG's 1.0.0 section as its notes. From then on every push to main runs `.github/workflows/release.yml`: [release-it](https://github.com/release-it/release-it) reads the conventional commit subjects since the last `v*` tag, bumps `package.json` (`fix` → patch, `feat` → minor, a breaking change — `!` or `BREAKING CHANGE` — → major), prepends the entry to `CHANGELOG.md`, commits `chore(release): v<version>`, tags `v<version>` and publishes the GitHub Release — as `github-actions[bot]`, so the release commit triggers no other workflow. The workflow refuses to run while no `v*` tag exists. `pnpm release` runs the same locally (a `GITHUB_TOKEN` with `repo` scope in the environment). Native builds are a separate, manual step — see [DOWNLOADS.md](DOWNLOADS.md).

## Native shell

`src-tauri/` is the vibe `iblai-vibe-ops-build` shell with the CRM's values; the
generated Xcode and Gradle projects under `src-tauri/gen/` are committed.

```bash
pnpm tauri:dev                       # desktop, on the dev server (devUrl in src-tauri/tauri.conf.json)
pnpm tauri dev -c '{"build":{"devUrl":"https://crm.ibl.ai","beforeDevCommand":""}}'   # the hosted app
pnpm tauri:build                     # installer for this platform
pnpm tauri:dev:ios "iPhone 16 Pro"   # a name from `xcrun simctl list devices`
pnpm tauri:dev:android "Pixel_9"     # a name from `emulator -list-avds`
pnpm tauri:dev:ios "iPhone 16 Pro" -c '{"build":{"devUrl":"https://crm.iblai.me","beforeDevCommand":""}}'   # the live app on the simulator (tauri:dev:android alike)
pnpm shell:smoke                     # headless: the guard and both sign-in returns against a local page (CI runs it)
pnpm shell:touch                     # the installer's app against the hosted app, with the checklist (Linux, macOS)
pnpm shell:touch:android             # the debug APK on the phone over adb, loading https://crm.iblai.me: scheme, launch, deep link, checklist
pnpm shell:touch:ios "iPhone 16 Pro" # the app on a simulator through `tauri ios dev`, loading https://crm.iblai.me: URL types, the scheme, checklist
pnpm shell:touch:windows             # Windows: the debug exe (the one with a console) against the hosted app; `shell:smoke:windows` headless
pnpm shell:clear [android | ios]     # forget the shell's cookies and localStorage so the next run starts signed out (Windows: shell:clear:windows)
```

First time on a machine, `scripts/mobile-init.sh` generates the project for its
OS: macOS makes `gen/apple` (needs Xcode and rustup); Linux makes `gen/android`
(needs rustup, JDK 17 and the Android SDK with Platform-Tools, Build-Tools, a
platform and an NDK, exported as `JAVA_HOME`, `ANDROID_HOME`, `NDK_HOME`). It
prints the one build that writes the URL scheme into the project; commit
`src-tauri/gen/` after it.

Sign-in: the auth app returns to the shell through `iblai-crm://` from the
system browser and through its own `iblai-mentor://` from inside the webview;
`src-tauri/src/lib.rs` rewrites both onto the app URL (`/sso-login-complete`).
Provider sign-in opens in `ASWebAuthenticationSession` (macOS, iOS), the system
browser (Android) or a popup window (Windows, Linux).

`tauri-check.yml` checks the shell on every change under `src-tauri/`: fmt, check
and test on Linux, macOS and Windows, the iOS arm from the Mac, then
`pnpm shell:smoke` headless. The touch tests (`pnpm shell:touch`, `shell:touch:windows`,
`shell:touch:ios`, `shell:touch:android`) are yours: a throwaway organization, the checklist
each prints, the log judged at the end.
