# E2E coverage

Playwright journeys in `e2e/journeys/`, signed in once through the real Auth
SPA by `e2e/auth.setup.ts`. `e2e/coverage.json` is the checkpoint list; keep
it in sync when user-facing behavior changes.

| Journey    | Checkpoints                                                                                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| auth       | A1 lands on `/platform/<org>` · A2 tokens + tenants stored · A3 URL org = session org                                                                                       |
| shell      | S1 sidebar navigation · S2 ⌘K palette · S3 profile menu names the org · S4 admin gate · S5 home period → `/overview/` window                                                |
| crm        | C1 person · C2 organization · C3 deal → kanban → won · C4 activity → done · C5 tag · C6 organization note · C7 favorite · C8 saved view · C9 history · C10 ⌘K server search |
| responsive | M1 phone header actions · M2 sheet yields to ⌘K · M3 tall dialog scrolls · M4 page scrolls under a touch on the header (the `mobile` project only)                          |

Run: `pnpm test:e2e` (all browsers), `pnpm test:e2e:ui`, `pnpm test:e2e:headed`.
Credentials go in `e2e/.env.development` (copy the example).

S5 and C6–C10 need a DM with the CRM 1.3.0 endpoints (DM 4.416.0).
