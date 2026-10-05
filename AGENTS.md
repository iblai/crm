# AGENTS.md — ibl.ai/crm

Guidance for AI assistants (Claude Code, Cursor, Codex…) working in this
repository. `CLAUDE.md` is a symlink to this file.

## What this is

ibl.ai/crm is a **multi-organization** CRM on the ibl.ai platform (the
os.ibl.ai model — architecture B in the vibe `docs/auth-model.md`). The
organization is in the URL: `/platform/[tenantKey]/…`. Users sign in with
ibl.ai SSO and switch between every organization they belong to. Records
come from the platform's CRM REST API (`/dm/api/crm/…`), scoped by the
session's org-bound `dm_token`.

Skills: install [iblai/vibe](https://github.com/iblai/vibe) skills
(`npx skills add iblai/vibe --all`). The relevant ones here are
`iblai-api-crm` (the endpoint contract), `iblai-vibe-crm-overview` (roles,
seeds), `iblai-vibe-auth` → "Going multi-org", `iblai-vibe-admin`,
`iblai-vibe-rbac`, `iblai-vibe-ops-build` / `-release` (native shells).

## Rules

1. **Organization from the URL.** Never hard-code a tenant. Read it with
   `useSession().tenantKey`; build links with `useSession().href(path)`.
2. **SDK components first.** The shell is the SDK's `SidebarProvider →
PlatformSidebar + SidebarInset` (`components/crm/app-sidebar.tsx`), loading
   is the SDK `Spinner`; profile dropdown, notifications, Account /
   Management, invitations, tenant switching all come from
   `@iblai/iblai-js`. Then shadcn/ui (`components/ui`, Base UI — use the
   `render` prop, not `asChild`; a `DropdownMenuLabel` must sit inside a
   `DropdownMenuGroup`; `CommandDialog` needs its own `<Command>` root; give
   popover search inputs `autoFocus`). Custom components last.
3. **CRM API is the contract.** Types in `lib/crm/types.ts`, hooks in
   `lib/crm/api.ts`. Deal `status`/`closed_at` are server-managed — use
   `move-stage/`, `won/`, `lost/`. Tags attach/detach through the host's
   `/tags/` endpoints. Lists are page-numbered (`next_page`), max page size 100,
   and take `search`, `ordering` and `date_filter`; never emulate those in the
   browser. The kanban is `/deals/board/`, the dashboard `/overview/`, ⌘K
   `/search/`.
4. **Every string is translated.** `useTranslations("<namespace>")` from
   next-intl; a key goes into all four of `messages/{en,es,fr,zh}.json` or none
   (`pnpm i18n:check`). Keys are typed from `messages/en.json` (`global.d.ts`): a
   key built at runtime needs a literal-union type, or a cast a test backs
   (`FieldLabelKey` in `view-bar.tsx`). Dates and amounts go through the
   locale-aware helpers in `lib/crm/format.ts` with `useLocale()`. Typographic
   `’` and `…`.
5. **Vocabulary.** The CRM account object is an **organization**, in the UI as
   in the API (route `/organizations`); the ibl.ai org the user belongs to is
   also an organization, and context keeps them apart. Never "tenant" in
   anything a user sees.
6. **Never touch tokens in prose or logs.** `dm_token` / `axd_token` stay in
   localStorage.
7. **Brand.** Primary `#0058cc`, tint `#eef6fc`, gradient CTA
   `className="ibl-button-primary"`, Lucide icons `strokeWidth={1.75}`,
   white cards with `border-[var(--border-color,#e5e7eb)]`. No dark mode work
   unless asked.
8. **Pages** are client components: `<PageHeader/>` then
   `<div className="flex-1 overflow-auto">` inside the org layout.
9. **Verify before you say it works:** `pnpm typecheck && pnpm lint && pnpm
format:check && pnpm i18n:check && pnpm test:coverage && pnpm build`; open the page;
   screenshot it. E2E journeys live in `e2e/journeys/` and sign in through the
   real Auth SPA.
10. **Commits:** conventional messages; never `--no-verify`.

## Where things are

| Concern                            | File                                                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Config & service URLs              | `lib/iblai/config.ts`                                                                                                         |
| Org resolution, admin check, hrefs | `lib/iblai/tenant.ts`                                                                                                         |
| Auth redirect, logout, org switch  | `lib/iblai/auth-utils.ts`                                                                                                     |
| Provider chain                     | `providers/iblai-providers.tsx`                                                                                               |
| SSO landing                        | `app/sso-login-complete/page.tsx`, `app/mobile-sso-login/page.tsx`                                                            |
| CRM data                           | `lib/crm/api.ts`, `lib/crm/types.ts`, `lib/crm/format.ts`, `lib/crm/views.ts`                                                 |
| Translations                       | `i18n/`, `messages/{en,es,fr,zh}.json`, `scripts/validate-i18n.mjs`, `lib/crm/i18n.ts`                                        |
| Shell                              | `app/platform/[tenantKey]/layout.tsx`, `components/crm/app-sidebar.tsx`, `top-bar.tsx`                                        |
| Record widgets                     | `components/crm/*.tsx` (tag picker, owner select, inline fields, timeline, history, favorite button, view bar, search picker) |
| Native shell                       | `src-tauri/`                                                                                                                  |
