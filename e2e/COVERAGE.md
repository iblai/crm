# E2E coverage

Playwright journeys in `e2e/journeys/`, signed in once through the real Auth
SPA by `e2e/auth.setup.ts`. `e2e/coverage.json` is the checkpoint list; keep
it in sync when user-facing behavior changes.

| Journey | Checkpoints                                                                           |
| ------- | ------------------------------------------------------------------------------------- |
| auth    | A1 lands on `/platform/<org>` · A2 tokens + tenants stored · A3 URL org = session org |
| shell   | S1 sidebar navigation · S2 ⌘K palette · S3 org switcher · S4 admin gate               |
| crm     | C1 person · C2 organization · C3 deal → kanban → won · C4 activity → done · C5 tag    |

Run: `pnpm test:e2e` (all browsers), `pnpm test:e2e:ui`, `pnpm test:e2e:headed`.
Credentials go in `e2e/.env.development` (copy the example).
