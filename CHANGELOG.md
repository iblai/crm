# Changelog

## 0.2.0 — 2026-10-03

- Toolchain: Next.js 16.3, TypeScript 7 (the native compiler is the `typescript` dependency; `next build` type-checks through its CLI), pnpm 12, oxlint 1.86, oxfmt 0.71 replacing prettier (Tailwind class sorting included). Node 22+.
- Shell: the SDK's `SidebarProvider → PlatformSidebar + SidebarInset` and footer cluster replace the local shadcn sidebar copy; the SDK `Spinner` everywhere; the brand tokens from `iblai-styles.css` are no longer overridden by shadcn's neutral defaults.
- i18n: every string goes through next-intl — English, Spanish, French and Chinese (`messages/{en,es,fr,zh}.json`, `pnpm i18n:check` keeps them in sync); the language follows the shared `openedx-language-preference` cookie and can be changed from the top bar; dates and amounts format in the active locale.
- "Companies" is the CRM object's name in the UI (route `/platform/<org>/companies`); the ibl.ai organization keeps its name.
- Server search on People, Companies, Deals and Tags, and on every person / company picker (no more first-100 lists); a server-side ⌘K across people, companies and deals; merged people hidden by default.
- Home dashboard from `/overview/` with a period picker; the kanban from `/deals/board/` with per-stage totals and stale badges.
- Companies get a timeline (activities attach to a company), favorites star people / companies / deals into the sidebar, saved views on People, Companies and Deals (filters and sorts; columns on People and Deals; table or board on Deals), a History tab with field-level changes on people, companies and deals, and one-call stage reordering in Settings.
- Message keys are type-checked against `messages/en.json` (`global.d.ts`), so a missing translation fails `pnpm typecheck`.
- Requires ibl-dm-pro 4.414.0 (`ibl-dm-crm-app` 1.3.0).

## 0.1.0 — 2026-09-21

Initial release of ibl.ai/crm.

- Multi-organization ibl.ai SSO (`/platform/<org>`), organization switcher, admin mode
- People, organizations, deals (kanban + table), activities, tags
- Pipelines, stages and lead sources settings; the four seeded CRM roles via the SDK Management surface
- Home dashboard, ⌘K search, notifications
- Tauri 2 shell for macOS, Windows, Linux, iOS and Android; release workflows
