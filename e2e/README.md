# E2E journeys

Playwright journeys in the OS shape: numbered specs, page objects, two signed-in
accounts, a coverage registry with a checker.

## Run

```bash
pnpm e2e:accounts      # once: creates the two test accounts (see Accounts)
pnpm dev               # the journeys drive http://localhost:3000
pnpm test:e2e          # chromium + the phone project
pnpm test:e2e:all      # every browser (firefox and webkit need `pnpm exec playwright install`)
pnpm test:e2e:ui       # Playwright's UI mode
pnpm test:e2e:headed   # watch chromium + the phone
pnpm e2e:coverage      # the registry against the specs and the app's pages
```

One spec: `pnpm exec playwright test --config e2e/playwright.config.ts --project=chromium e2e/journeys/04-people.spec.ts`.
Every Playwright command needs `--config e2e/playwright.config.ts`: the repo root holds no config.

## Accounts

`pnpm e2e:accounts` creates an organization admin and a member holding the CRM User role in the
**throwaway organization `iblai.env` names** (`PLATFORM`, `TOKEN`), through the platform API, and
saves them in the gitignored `e2e/.env.development`. It refuses `main` and the placeholders. Get
`iblai.env` from `/iblai-vibe-connect` run **from an empty directory** with
`--origin http://localhost:3000` (from this root it would rewrite `NEXT_PUBLIC_MAIN_TENANT_KEY`,
which must stay `main`), pick the throwaway organization on the connect page, and move its
`iblai.env` here. Never read or print `e2e/.env.development` or `iblai.env`.

`auth.setup.ts` signs each account in through the real Auth SPA once per browser, finding the login
page by structure (a password field, a button named like "password", an email field, a submit
button) and saving `playwright/.auth/user-setup-<browser>.json` (admin) and `member-<browser>.json`.
Without the member pair the member journeys skip; a member without the CRM User role would be sent
to registration, so the accounts script grants it before saving the pair.

## Layout

```
e2e/
  playwright.config.ts            projects: setup-*, chromium / firefox / webkit, mobile (Pixel 7)
  auth.setup.ts                   the structural sign-in, admin + member
  create-accounts.mjs             pnpm e2e:accounts
  coverage.json · COVERAGE.md     the registry and its checklist
  scripts/check-journey-coverage.mjs
  fixtures/crm-test.ts            `test` with the page objects, `memberPage`, the safety-net routes
  fixtures/test-data.ts           env constants, `E2E <Kind> <stamp>` name generators, SDK strings
  utils/app.ts                    gotoHome, heading(), field(), confirm(), toast(), openSheet(), …
  utils/residue.ts                globalTeardown: deletes every E2E-prefixed record
  page-objects/*.page.ts          Shell, ListPage, RecordPage, Dialogs, ActivitiesPage, SettingsPage, HomePage
  journeys/NN-name.spec.ts        one journey per route or feature area
```

## Writing a journey

- Import `test` and `expect` from `../fixtures/crm-test`, never from `@playwright/test`.
- Name the file `journeys/NN-kebab.spec.ts` with the next number; the describe is
  `"Journey N: Title Case — Admin|Non-Admin|Unauthenticated"`.
- One test per checkpoint, the id first: `"ppl-01: admin creates a person and lands on the record"`.
  Titles start with the actor. Add the id to `coverage.json` and `COVERAGE.md` in the same change.
- Locators through the page objects, `getByRole` first. `#main-content` scopes the page (the SDK's
  notifications panel adds a second `main`); dialogs by name; the h1 through `shell.heading()` (its
  name carries a count badge); record pages have no h1, their name is a button.
- Every record a test creates is named by a `fixtures/test-data.ts` generator (`E2E …`), so the
  sweeper finds it. Tests that change shared state (language, Admin mode, the default pipeline, the
  sidebar, the deals layout) restore it in `finally` and run serially.
- Chained checkpoints use `test.describe.configure({ mode: "serial" })` and share module-scope data.
- A known app defect: `// fixme: <reason>` above `test.fixme(...)`, `status: "pending"` in the
  registry. Never `isVisible({ timeout }).catch()`; use `isVisibleWithin()` from `utils/app.ts`.
- Anonymous checks: `test.use({ storageState: { cookies: [], origins: [] } })`.
- Nothing clicks "Log Out", "Sign out", "Sign in again" or "Create your organization"; the fixtures
  abort the checkout and invitation requests as a backstop. Never mock a 401 (the API client logs out).

## Traps

- The first tap on "Toggle sidebar" right after a sheet row navigated is swallowed on a phone:
  `shell.openSheet()` retries.
- The language select writes the choice to the profile for every ibl.ai app of that user.
- The home page waits for the DM overview reads; the per-test budget is 90 s for that reason.
- The SDK localizes its landmark names with the UI language ("Navegación principal" in Spanish):
  `SDK.nav` in `fixtures/test-data.ts` lists them.
- Journey 16 ignores `429` resource errors: the DM throttles the suite's request burst. Journey 17
  reports `color-contrast` without gating on it: the house muted grey (`#717985` on white) measures
  4.39:1 at 11–14 px against the 4.5:1 floor on every page, a style decision, not a regression.
- `pnpm lint` under the rtk wrapper may print a JSON parse error; `rtk proxy pnpm exec oxlint --max-warnings 22`
  is the raw check.
