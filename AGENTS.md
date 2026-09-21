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
2. **SDK components first.** Profile dropdown, notifications, Account /
   Management, invitations, tenant switching all come from
   `@iblai/iblai-js`. Then shadcn/ui (`components/ui`, Base UI — use the
   `render` prop, not `asChild`). Custom components last.
3. **CRM API is the contract.** Types in `lib/crm/types.ts`, hooks in
   `lib/crm/api.ts`. Deal `status`/`closed_at` are server-managed — use
   `move-stage/`, `won/`, `lost/`. Tags attach/detach through the host's
   `/tags/` endpoints. Lists are page-numbered (`next_page`), max page size 100.
4. **Never touch tokens in prose or logs.** `dm_token` / `axd_token` stay in
   localStorage; `IBLAI_API_KEY` is server-only (`lib/iblai/platform.ts`).
5. **Brand.** Primary `#0058cc`, tint `#eef6fc`, gradient CTA
   `className="ibl-button-primary"`, Lucide icons `strokeWidth={1.75}`,
   white cards with `border-[var(--border-color,#e5e7eb)]`. No dark mode work
   unless asked.
6. **Pages** are client components: `<PageHeader/>` then
   `<div className="flex-1 overflow-auto">` inside the org layout.
7. **Verify before you say it works:** `pnpm typecheck && pnpm lint && pnpm
test && pnpm build`; open the page; screenshot it. E2E journeys live in
   `e2e/journeys/` and sign in through the real Auth SPA.
8. **Commits:** conventional messages; never `--no-verify`.

## Where things are

| Concern                            | File                                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------------------- |
| Config & service URLs              | `lib/iblai/config.ts`                                                                  |
| Org resolution, admin check, hrefs | `lib/iblai/tenant.ts`                                                                  |
| Auth redirect, logout, org switch  | `lib/iblai/auth-utils.ts`                                                              |
| Provider chain                     | `providers/iblai-providers.tsx`                                                        |
| SSO landing                        | `app/sso-login-complete/page.tsx`, `app/mobile-sso-login/page.tsx`                     |
| CRM data                           | `lib/crm/api.ts`, `lib/crm/types.ts`, `lib/crm/format.ts`                              |
| Shell                              | `app/platform/[tenantKey]/layout.tsx`, `components/crm/app-sidebar.tsx`, `top-bar.tsx` |
| Record widgets                     | `components/crm/*.tsx` (tag picker, owner select, inline fields, timeline)             |
| Native shell                       | `src-tauri/`                                                                           |
