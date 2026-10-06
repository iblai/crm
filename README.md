<div align="center">

<a href="https://ibl.ai"><img src="https://ibl.ai/images/iblai-logo.png" alt="ibl.ai" width="300"></a>

# ibl.ai/crm

[![Watch the intro video](https://img.youtube.com/vi/KIz0XiJOizw/maxresdefault.jpg)](https://www.youtube.com/watch?v=KIz0XiJOizw)

**▶︎ [Watch the intro video](https://www.youtube.com/watch?v=KIz0XiJOizw)** &nbsp;·&nbsp; _Organizations, people, deals, activities and tags in five minutes_

**The open-source CRM for organizations on the ibl.ai platform.**

People, organizations, deals, activities and tags — for every organization you belong to, with ibl.ai single sign-on and roles built in. One codebase. Every platform. Your data, your organization, your rules.

[![Join](https://img.shields.io/badge/Join-blue)](https://ibl.ai/join)
[![About](https://img.shields.io/badge/About-ibl.ai-blue)](https://ibl.ai)
[![Docs](https://img.shields.io/badge/Docs-ibl.ai%2Fdocs-green)](https://ibl.ai/docs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)
[![SOC 2 Type II](https://img.shields.io/badge/SOC_2-Type_II-blue)](https://ibl.ai)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![Tauri](https://img.shields.io/badge/Tauri-2-FFC131?logo=tauri&logoColor=white)](https://tauri.app)

<br>

### ⬇️ Get ibl.ai/crm

<img src="https://img.shields.io/badge/Web-crm.ibl.ai_(coming_soon)-2563eb?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Web — crm.ibl.ai, coming soon" height="42">
&nbsp;
<img src="https://img.shields.io/badge/macOS-(coming_soon)-000000?style=for-the-badge&logo=apple&logoColor=white" alt="macOS — coming soon" height="42">
&nbsp;
<img src="https://img.shields.io/badge/Windows-(coming_soon)-0078D4?style=for-the-badge&logo=windows&logoColor=white" alt="Windows — coming soon" height="42">

<a href="docs/platform-deployment.md#ios"><img src="https://img.shields.io/badge/iOS-App_Store_(coming_soon)-000000?style=for-the-badge&logo=apple&logoColor=white" alt="iOS — coming soon" height="42"></a>
&nbsp;
<a href="docs/platform-deployment.md#android"><img src="https://img.shields.io/badge/Android-Google_Play_(coming_soon)-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Android — coming soon" height="42"></a>

<sub>Hosted web app and published builds coming soon · today: [run it locally](#quick-start) or [deploy it yourself](#deployment) · [how builds are made](docs/DOWNLOADS.md)</sub>

<br>

[Why ibl.ai/crm](#why-iblaicrm) · [Every platform](#every-platform-one-codebase) · [Features](#features) · [Screenshots](#screenshots) · [Quick Start](#quick-start) · [Deployment](#deployment) · [Architecture](#architecture)

</div>

---

<div align="center">

**SOC 2 Type II** &nbsp;·&nbsp; Universities, enterprises, and governments run on ibl.ai — [read the case studies →](https://ibl.ai/case-studies)

</div>

---

## Why ibl.ai/crm

|                                   |                                                                                                                                                                                                                                         |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🔓 **Your code, your data**       | MIT-licensed and self-hostable. The CRM records live in your ibl.ai organization, scoped by the platform's own multi-tenancy — no second database, no vendor lock-in.                                                                   |
| 🏢 **Every organization you own** | Sign in once with ibl.ai SSO and switch between all of your organizations, exactly like [os.ibl.ai](https://os.ibl.ai). Each organization gets its own people, pipelines, deals and roles.                                              |
| 🧭 **The Twenty way, on ibl.ai**  | The information architecture of [Twenty](https://github.com/twentyhq/twenty) — objects in a sidebar, saved table & board views, favorites, record pages with a timeline and a history — built on the ibl.ai CRM API and SDK components. |
| 🌍 **Four languages**             | English, Spanish, French and Chinese, following the language you chose in any other ibl.ai app.                                                                                                                                         |
| 📱 **Truly everywhere**           | One codebase for web, macOS, Windows, Linux, iOS and Android — native shells around the same app. The hosted web app and published builds are coming soon.                                                                              |
| 🔐 **Enterprise-ready**           | SSO (OAuth / OIDC / SAML via the platform), four seeded CRM roles (Viewer, User, Manager, Inviter), org-level notifications, invitations that turn leads into platform users.                                                           |

---

## Every platform, one codebase

ibl.ai/crm meets your team wherever they are — the same product, native everywhere.

<div align="center">

| Platform    |     | Status                                                                                                                                                     |
| ----------- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Web**     | 🌐  | Coming soon at **crm.ibl.ai** — today, [run it locally](#quick-start) or [deploy it yourself](#deployment)                                                 |
| **macOS**   | 🍎  | Native app (universal .dmg, Intel + Apple Silicon) — built by the [release workflow](.github/workflows/tauri-release-macos-dmg.yml); downloads coming soon |
| **Windows** | 🪟  | Native app (x64 + ARM64 installer) — built by the [release workflow](.github/workflows/tauri-release-windows.yml); downloads coming soon                   |
| **Linux**   | 🐧  | Native app (`.deb` / AppImage) — built by the [desktop build workflow](.github/workflows/tauri-build-desktop.yml); downloads coming soon                   |
| **iOS**     | 📱  | Native app — built by the [iOS workflow](.github/workflows/tauri-build-ios.yml); App Store listing coming soon                                             |
| **Android** | 🤖  | Coming soon — the Android project is not set up yet (`pnpm tauri android init`)                                                                            |

</div>

The native apps are [Tauri 2](https://tauri.app) WebView shells around the hosted app (`src-tauri/`), so they load crm.ibl.ai and work once it is live — or point them at your own deployment ([docs/development.md](docs/development.md)). They are built the same way [iblai/os](https://github.com/iblai/os) and [iblai/lms](https://github.com/iblai/lms) ship. Sign-in on mobile goes through the system browser and returns via the `iblai-crm://` deep link. See [docs/platform-deployment.md](docs/platform-deployment.md).

---

## Features

<table>
<tr>
<td width="50%" valign="top">

**👥 People & organizations**

- **People** — leads, contacts and customers with lifecycle stage, owner, job title, emails, phones, and tags; merged duplicates stay out of the way
- **Organizations** — accounts with address, owner and tags; the people, deals and the timeline that belong to them
- **Invite · link · merge** — turn a lead into a platform user by email invitation, link a person to an existing user, or merge duplicates
- **Tags** — colored labels shared across people, organizations and deals
- **Search, sort, views** — server-side search and sorting on every list; save a view with its filters, sort and columns (table or board); star anything into the sidebar's Favorites

**💼 Deals & pipelines**

- **Kanban board** — drag deals between stages; columns show count, value and win probability; stale deals are flagged after the pipeline's `rotten_days`
- **Table view** — filter by status, owner, source, tags; page through everything
- **Deal page** — stage stepper, mark won / lost (with reason), reopen, value & currency, expected close, timeline, field-change history
- **Pipelines & stages** — seeded default pipeline (New → Qualified → Proposal → Negotiation → Won / Lost); create your own, reorder stages, set probabilities and terminal flags; lead sources

</td>
<td width="50%" valign="top">

**🗓️ Activities**

- **Timeline** on every person, organization and deal — calls, meetings, emails, notes, tasks, lunches, deadlines
- **Schedule** — scheduled work with an owner; overdue / today / upcoming views; mark done
- **Auto-recorded history** — stage changes are logged for you

**📊 Home**

- **Dashboard** — open deals, pipeline and weighted value, won this month, work due today; deals by stage; won vs lost over six months; what's up next — with a period picker (today, 7, 30, 90 days)

**🏢 Operate & scale**

- **Multi-organization** — the organization is in the URL (`/platform/<org>/…`); switch between every organization you belong to from the profile menu
- **SSO & roles** — ibl.ai sign-in; CRM Viewer / User / Manager / Inviter roles assigned on the Users & roles page (the SDK's Management surface)
- **Notifications** — person created, deal stage changed, person linked to user — in the bell and the notifications center
- **⌘K** — one server-side search across people, organizations and deals; jump anywhere; create anything
- **Native shells** — macOS, Windows, Linux and iOS via Tauri 2; Android and published builds coming soon

</td>
</tr>
</table>

---

## Screenshots

<div align="center">

<sub>Screenshots of the seeded walkthrough organization are on their way — run <code>pnpm screenshots</code> to regenerate them into <code>docs/images/</code> (see <a href="docs/development.md">docs/development.md</a>).</sub>

</div>

---

## Quick Start

```bash
git clone https://github.com/iblai/crm.git
cd crm
pnpm install --ignore-scripts
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). You are sent to [login.iblai.app](https://login.iblai.app) to sign in and come back to `/platform/<your-org>` — the CRM of the organization your session is scoped to. Use the switcher in the profile menu to move between organizations.

No configuration is required against hosted `iblai.app`: the service URLs default in [`lib/iblai/config.ts`](lib/iblai/config.ts). Copy `.env.example` to `.env.local` only to point at a self-hosted platform or to change the community org (`NEXT_PUBLIC_MAIN_TENANT_KEY`, default `main`).

**Using [Claude Code](https://claude.ai/claude-code)?** This repo ships with the [iblai/vibe](https://github.com/iblai/vibe) skills in mind — read [`AGENTS.md`](AGENTS.md) first.

Node.js 22+ and pnpm 12 (`corepack enable` picks the pinned version up from `package.json`).

> **Node.js 25+ note:** the `dev` script sets `NODE_OPTIONS='--no-experimental-webstorage'` so the SDK's browser-storage guards do not collide with Node's experimental `localStorage`. Keep that flag if you customize the script.

### Scripts

| Command              | What it does                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| `pnpm dev`           | Dev server on port 3000                                                                                 |
| `pnpm build`         | Production build (standalone output)                                                                    |
| `pnpm start`         | Serve the production build                                                                              |
| `pnpm typecheck`     | TypeScript 7                                                                                            |
| `pnpm lint`          | oxlint, under a warning budget (`--max-warnings`)                                                       |
| `pnpm format`        | oxfmt (`pnpm format:check` in CI)                                                                       |
| `pnpm i18n:check`    | Same keys in the four catalogs; no “tenant”, no “company”, no ASCII apostrophe                          |
| `pnpm test`          | Vitest unit tests (`pnpm test:coverage` in CI: 85 % lines on `lib/`)                                    |
| `pnpm test:e2e`      | Playwright journeys (needs `e2e/.env.development`)                                                      |
| `pnpm release`       | release-it: version from the commits, CHANGELOG, tag, GitHub Release (CI runs it on every push to main) |
| `pnpm tauri dev`     | Desktop shell in dev mode (needs Rust)                                                                  |
| `pnpm tauri build`   | Desktop installer for the current platform                                                              |
| `pnpm tauri ios dev` | iOS simulator (needs Xcode)                                                                             |

---

## Deployment

ibl.ai/crm is a front end for the ibl.ai platform. The platform provides sign-in, organizations, roles, notifications and the CRM API; this repository provides the app.

### Option A: Hosted ibl.ai platform

1. **Build**

   ```bash
   pnpm build
   PORT=3000 pnpm start
   ```

2. **Or run with Docker**

   ```bash
   docker build -t iblai-crm .
   docker run -p 3000:3000 iblai-crm
   ```

   `NEXT_PUBLIC_*` values are inlined at build time and `.env*` files stay out of the image, so a self-hosted platform passes its URLs as build arguments: `--build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com --build-arg NEXT_PUBLIC_AUTH_URL=https://login.example.com --build-arg NEXT_PUBLIC_PLATFORM_BASE_DOMAIN=example.com` (omit them for hosted `iblai.app`). The Dockerfile declares these three and `NEXT_PUBLIC_MAIN_TENANT_KEY`; any other `NEXT_PUBLIC_*` setting needs an `ARG` of its own there.

   The build emits a self-contained server under `.next/standalone/` (Next.js [standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)).

3. **Register the origin.** Every origin the app runs on (`http://localhost:3000`, `https://crm.example.com`, the `iblai-crm://` native scheme) must be an allowed redirect origin of the organizations that sign in, or the Auth SPA never returns. Ask your ibl.ai operator.

### Option B: Self-hosted platform

Set the service URLs in `.env.local` for `pnpm dev` and `pnpm build`, or as Docker build arguments (above); see [Configuration](#configuration). If you need the full backend, reach out at [ibl.ai/contact](https://ibl.ai/contact) for an enterprise license and deploy it with [iblai/iblai-infra-cli](https://github.com/iblai/iblai-infra-cli).

### Every surface, on your own backend

Ship **Web, macOS, Windows, Linux, iOS and Android** pointed at your own deployment — one web codebase, with the native apps as WebView shells around it:

**→ [Platform deployment guide](docs/platform-deployment.md)** (per-surface build, backend config, release, store submission).

#### Build-time flags (native apps)

The Tauri shell reads two optional compile-time flags (Rust `option_env!`) and exposes them as commands; set them in the build shell before `pnpm tauri build`. The web app does not read these commands yet, so neither flag changes the app today — the organization lock and the in-app purchase UI are coming soon:

| Env var                     | Tauri command                  | Default         | Effect                                                                                         |
| --------------------------- | ------------------------------ | --------------- | ---------------------------------------------------------------------------------------------- |
| `IBL_TENANT`                | `get_locked_tenant` → `string` | `""` (unlocked) | **Organization lock** (coming soon): the organization a build is meant for. Empty = multi-org. |
| `IBL_ALLOW_IN_APP_PURCHASE` | `allow_in_app_purchase` → bool | `false`         | In-app purchase UI (coming soon). Truthy: `1`, `true`, `yes`, `on`.                            |

```bash
IBL_TENANT=acme pnpm tauri build   # a build meant for the "acme" organization
```

---

## Configuration

All app config is `NEXT_PUBLIC_*` and optional against hosted `iblai.app`. Defaults live in [`lib/iblai/config.ts`](lib/iblai/config.ts).

| Variable                           | Default                   | Description                                                                  |
| ---------------------------------- | ------------------------- | ---------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL`         | `https://api.iblai.app`   | Consolidated API; `/dm` (CRM), `/lms`, `/axd` are derived from it            |
| `NEXT_PUBLIC_AUTH_URL`             | `https://login.iblai.app` | The hosted Auth SPA                                                          |
| `NEXT_PUBLIC_PLATFORM_BASE_DOMAIN` | `iblai.app`               | Base domain; with no API base, services resolve to their own subdomains      |
| `NEXT_PUBLIC_MAIN_TENANT_KEY`      | `main`                    | The community organization — the default when nothing else resolves          |
| `NEXT_PUBLIC_IBL_PLATFORM`         | `mentor`                  | `app=` sent to the Auth SPA (the OS's value, so every organization signs in) |
| `NEXT_PUBLIC_TAURI_CUSTOM_SCHEME`  | `iblai-crm`               | Deep-link scheme the native shells return through after SSO                  |
| `NEXT_PUBLIC_DEFAULT_CURRENCY`     | `USD`                     | Currency preselected on new deals                                            |
| `NEXT_PUBLIC_ENABLE_RBAC`          | `false`                   | Gate SDK admin surfaces on RBAC policies as well as the admin flag           |

---

## Architecture

```
crm/
├── app/
│   ├── page.tsx                          # `/` → /platform/<session org>
│   ├── platform/[tenantKey]/             # everything inside one organization
│   │   ├── layout.tsx                    # sidebar + top bar shell (admin gate)
│   │   ├── page.tsx                      # Home dashboard
│   │   ├── people/ · organizations/      # lists + record pages (timeline · history)
│   │   ├── deals/                        # kanban · table · deal page
│   │   ├── activities/ · tags/           # timeline work · labels
│   │   ├── settings/                     # pipelines · stages · lead sources
│   │   ├── notifications/[[...id]]/      # SDK NotificationDisplay
│   │   └── admin/users/                  # SDK Account → Management (roles)
│   ├── sso-login-complete/               # SSO landing (outside the providers)
│   ├── mobile-sso-login/                 # native deep-link landing
│   └── api/auth-redirect/                # same-origin hop to the Auth SPA
├── components/crm/                       # sidebar, top bar, ⌘K, record widgets
├── components/ui/                        # shadcn/ui (Base UI) primitives
├── hooks/                                # useSession, useMembers
├── lib/crm/                              # CRM types · RTK Query slice · formatting · saved-view helpers
├── i18n/ · messages/                     # next-intl config · en/es/fr/zh catalogs
├── lib/iblai/                            # config · tenant resolution · auth helpers
├── providers/iblai-providers.tsx         # Redux > AuthProvider > TenantProvider
├── store/iblai-store.ts                  # SDK slices + crmApi
├── src-tauri/                            # Tauri 2 shell (macOS · Windows · Linux · iOS · Android)
├── e2e/ · __tests__/                     # Playwright journeys · Vitest
└── docs/                                 # deployment, downloads, development
```

### Data flow

```
User → React pages → RTK Query (lib/crm/api.ts) → https://api.iblai.app/dm/api/crm/…
                                    ↓                       Authorization: Token <dm_token>
                           @iblai/iblai-js SDK
                           ├── /web-utils        AuthProvider · TenantProvider · tenant switch
                           ├── /web-containers   profile dropdown · notifications · Account/Management
                           └── /data-layer       platform users · org metadata
```

Sign-in is the platform's hosted round trip (`login.<domain>/login?app=mentor&redirect-to=<origin>&tenant=<org>` → `/sso-login-complete?data=…`). `TenantProvider` compares the organization in the URL with the one the session is scoped to and re-authenticates when they differ, handing back an org-scoped token pair. The CRM API infers the organization from that token — there is no `?platform_key=` — so every record you see belongs to the organization in the URL. Details: [`docs/development.md`](docs/development.md).

### The CRM API

Ten Platform-scoped resources under `/dm/api/crm/`: persons, organizations, pipelines (with nested stages and `stages/reorder/`), lead-sources, deals (`move-stage/`, `won/`, `lost/`, the `board/`), activities (`done/`), tags (attach / detach on persons, organizations, deals), favorites and saved views — plus `search/`, `overview/` and `…/{id}/history/`, and `?search=` / `?ordering=` / `?date_filter=` on every list. Every organization is seeded with a default pipeline, six stages and four lead sources. The full contract lives in the [`iblai-api-crm`](https://github.com/iblai/vibe/tree/main/skills/organizations/iblai-api-crm) and [`iblai-vibe-crm-overview`](https://github.com/iblai/vibe/tree/main/skills/organizations/iblai-vibe-crm-overview) skills of [iblai/vibe](https://github.com/iblai/vibe). This release needs ibl-dm-pro 4.416.0 (`ibl-dm-crm-app` 1.3.0).

---

## Testing

```bash
pnpm test            # Vitest — formatting, saved views, tenant resolution, SSO landing, config
pnpm i18n:check      # en / es / fr / zh catalogs carry the same keys and the house vocabulary
pnpm test:coverage   # the unit tests with the coverage gate CI runs
pnpm test:e2e        # Playwright journeys (copy e2e/.env.development.example first)
pnpm test:e2e:ui     # interactive UI mode
```

The Playwright suite signs in once through the real Auth SPA (`e2e/auth.setup.ts`) and reuses the session across the journeys in `e2e/journeys/`.

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md). If you use AI-assisted tooling, read [AGENTS.md](AGENTS.md) first — it explains the SDK-first component rule, the multi-organization model, and how to verify a change.

---

## Resources

- [Documentation](https://ibl.ai/docs)
- [Development Guide](docs/development.md) — setup, scripts, architecture, configuration
- [Agentic OS](https://github.com/iblai/os) · [Agentic LMS](https://github.com/iblai/lms) — the sibling apps this CRM mirrors
- [Vibe](https://github.com/iblai/vibe) — the skills and SDK toolkit for building on ibl.ai
- [@iblai/iblai-js](https://www.npmjs.com/package/@iblai/iblai-js) — the ibl.ai SDK
- [Twenty](https://github.com/twentyhq/twenty) — the CRM whose product model inspired this one

---

<div align="center">

## License

MIT License. See [LICENSE](LICENSE) for details.

<br>

**[ibl.ai](https://ibl.ai)** · Your organization's AI, under your control.

</div>
