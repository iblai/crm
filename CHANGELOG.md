# Changelog

## 1.0.0 — 2026-10-07

- First public release; from here every push to main is released by release-it from the commit subjects.
- Toolchain: Next.js 16.3, TypeScript 7 (the native compiler is the `typescript` dependency; `next build` type-checks through its CLI), pnpm 12, oxlint 1.86, oxfmt 0.71 replacing prettier (Tailwind class sorting included). Node 22+.
- Shell: the SDK's `SidebarProvider → PlatformSidebar + SidebarInset` and footer cluster replace the local shadcn sidebar copy; the SDK `Spinner` everywhere; the brand tokens from `iblai-styles.css` are no longer overridden by shadcn's neutral defaults.
- i18n: every string goes through next-intl — English, Spanish, French and Chinese (`messages/{en,es,fr,zh}.json`, `pnpm i18n:check` keeps them in sync); the language of record is the profile’s (`public_metadata.language`, the OS pattern): applied on load, changed from the top bar or the Profile tab, and written to the shared `openedx-language-preference` cookie; dates and amounts format in the active locale.
- Server search on People, Organizations, Deals and Tags, and on every person / organization picker (no more first-100 lists); a server-side ⌘K across people, organizations and deals; merged people hidden by default.
- Home dashboard from `/overview/` with a period picker; the kanban from `/deals/board/` with per-stage totals and stale badges.
- Organizations get a timeline (activities attach to an organization), favorites star people / organizations / deals into the sidebar, saved views on People, Organizations and Deals (filters and sorts; columns on People and Deals; table or board on Deals), a History tab with field-level changes on people, organizations and deals, and one-call stage reordering in Settings.
- Message keys are type-checked against `messages/en.json` (`global.d.ts`), so a missing translation fails `pnpm typecheck`.
- Deal cards and tables read `person_name` / `organization_name` from the DM and the people table `organization_name` (no first-100 lookups); the star asks `/favorites/?person=` instead of scanning; Settings opens to CRM Managers by role; lists, the board, history and pickers show the DM's error instead of an empty state; the default pipeline can be changed (one default at a time); saved-view filters only offer what the DM filters; copy follows what the DM does on delete, merge and link.
- CI: `pnpm lint` under a warning budget, `pnpm test:coverage` with an 85 % line gate on the pure `lib/` modules, the i18n check refusing “tenant” / “company” wording and ASCII apostrophes, `checkout`, `setup-node` and `pnpm/action-setup` on their Node 24 majors, every action pinned to a commit; release builds run without caches.
- Requires ibl-dm-pro 4.416.0 (`ibl-dm-crm-app` 1.3.0).

## 0.1.0 — 2026-09-21

Initial release of ibl.ai/crm.

- Multi-organization ibl.ai SSO (`/platform/<org>`), organization switcher, admin mode
- People, organizations, deals (kanban + table), activities, tags
- Pipelines, stages and lead sources settings; the four seeded CRM roles via the SDK Management surface
- Home dashboard, ⌘K search, notifications
- Tauri 2 shell for macOS, Windows, Linux, iOS and Android; release workflows
