# ibl.ai/crm E2E coverage — user journey checklist

> Last updated: 2026-10-30 | 112 checkpoints (112 covered, 0 pending, 0 deprecated) | 18 journeys | 100% covered | Auth: admin + member storageState

## How this works

Each **checkpoint** is one test in a journey spec; its id heads the test title (`ppl-01: …`).
`e2e/coverage.json` is the machine-readable twin: `pnpm e2e:coverage` checks that every spec
exists, that the ids in the registry and in the specs match both ways, and (`--all`) that every
`app/**/page.tsx` sits in some journey's `sourceFiles`. `--no-regress` compares the counts with
`origin/main`.

When a page, dialog, button or flow changes:

1. Add or update the checkpoint in the journey below (or start a new numbered journey)
2. Write the test, its id first in the title
3. Mark it `[x]` here and `covered` in `coverage.json`; a known app defect is `// fixme:` + `test.fixme`, `[ ]` and `pending`
4. Never delete a checkpoint: a retired surface becomes `deprecated`

The journeys run as the two accounts `pnpm e2e:accounts` creates in a throwaway organization (an admin and a
member holding the CRM User role); every record they create is `E2E`-prefixed and swept at the end of the run.

---

## Journey 1: Authentication (10 checkpoints) — `journeys/01-authentication.spec.ts`

**Source files:** `app/page.tsx`, `app/join/page.tsx`, `app/error/[code]/page.tsx`, `app/mobile-sso-login/page.tsx`, `app/api/auth-redirect/route.ts`, `providers/iblai-providers.tsx`, `lib/iblai/auth-utils.ts`, `lib/iblai/auth-redirect.ts`, `lib/iblai/tenant.ts`, `components/notice-card.tsx`

- [x] auth-01 admin opens the app root and lands on the organization's home
- [x] auth-02 the sign-in stored both tokens and the organization list
- [x] auth-03 the URL's organization is the session's current organization
- [x] auth-04 a visitor without a session is sent to the Auth SPA with a way back
- [x] auth-05 /join shows the create-your-organization notice
- [x] auth-06 the 403 and 404 pages name the problem and offer a way home
- [x] auth-07 an unknown error code falls back to the generic title
- [x] auth-08 the auth-redirect hop refuses any target but the Auth SPA
- [x] auth-09 a malformed native sign-in payload lands on the 400 page
- [x] auth-10 /join's Create your organization opens the $0 checkout that returns to this app

---

## Journey 2: Shell and Navigation (8 checkpoints) — `journeys/02-shell-navigation.spec.ts`

**Source files:** `app/platform/[tenantKey]/layout.tsx`, `components/crm/app-sidebar.tsx`, `components/crm/nav-row.tsx`, `components/crm/top-bar.tsx`, `components/crm/breadcrumbs.tsx`, `components/crm/user-menu.tsx`, `components/crm/language-menu.tsx`, `components/crm/admin-mode.tsx`, `components/crm/admin-mode-switch.tsx`, `components/crm/account-sheet.tsx`, `components/crm/page-header.tsx`, `components/language-preference-sync.tsx`, `lib/locale-cookie.ts`

- [x] nav-01 admin clicks every sidebar row and reaches its page
- [x] nav-02 the breadcrumb roots at the organization and ends at the page
- [x] nav-03 admin collapses the sidebar to the rail and expands it back
- [x] nav-04 the profile menu offers Profile, Account and Log Out
- [x] nav-05 admin switches the language to Spanish and back
- [x] nav-06 User mode hides Settings and Management, survives a reload and bounces /settings home
- [x] nav-07 the footer's Management opens the Management dialog, not a page
- [x] nav-08 the footer's Integrations and Advanced open their dialogs and Support links out

---

## Journey 3: Command Palette (6 checkpoints) — `journeys/03-command-palette.spec.ts`

**Source files:** `components/crm/command-palette.tsx`

- [x] pal-01 ⌘K opens the palette with the search focused
- [x] pal-02 the Go to group reaches People
- [x] pal-03 the New person item opens the dialog, which creates the person
- [x] pal-04 typing a name finds the person through server search and opens it
- [x] pal-05 a query that matches nothing lists no record groups
- [x] pal-06 Escape closes the palette

---

## Journey 4: People (12 checkpoints) — `journeys/04-people.spec.ts`

**Source files:** `app/platform/[tenantKey]/people/page.tsx`, `app/platform/[tenantKey]/people/[id]/page.tsx`, `components/crm/people/people-table.tsx`, `components/crm/people/person-dialog.tsx`, `components/crm/people/person-invite-dialog.tsx`, `components/crm/people/person-link-user-dialog.tsx`, `components/crm/people/person-merge-dialog.tsx`, `components/crm/people/deals-mini-table.tsx`, `components/crm/people/crm-error.ts`, `components/crm/inline-field.tsx`, `components/crm/history-tab.tsx`, `components/crm/favorite-button.tsx`, `components/crm/favorites-section.tsx`, `components/crm/tag-picker.tsx`, `components/crm/tag-chip.tsx`, `components/crm/pagination-bar.tsx`, `components/crm/confirm-dialog.tsx`, `components/crm/badges.tsx`, `components/crm/entity-avatar.tsx`, `components/crm/owner-select.tsx`

- [x] ppl-01 admin creates a person and lands on the record
- [x] ppl-02 the People list finds the person and its row opens the record
- [x] ppl-03 an inline edit of the job title shows up in the History tab
- [x] ppl-04 starring the person lists it under the sidebar's Favorites
- [x] ppl-05 the lifecycle select moves the person to Qualified
- [x] ppl-06 the tag picker creates a tag and attaches it
- [x] ppl-07 Invite to platform needs an email, then opens the invitation confirm
- [x] ppl-08 More actions offers link, merge and delete; Link to user opens its dialog
- [x] ppl-09 merging a duplicate folds it into the person
- [x] ppl-10 a person with a deal cannot be deleted until the deal goes
- [x] ppl-11 the pagination bar counts the matching people
- [x] ppl-12 admin deletes the person and the list no longer finds them

---

## Journey 5: Organizations (7 checkpoints) — `journeys/05-organizations.spec.ts`

**Source files:** `app/platform/[tenantKey]/organizations/page.tsx`, `app/platform/[tenantKey]/organizations/[id]/page.tsx`, `components/crm/organizations/organization-dialog.tsx`, `components/crm/organizations/organizations-table.tsx`, `components/crm/activity-timeline.tsx`, `components/crm/search-picker.tsx`

- [x] org-01 admin creates an organization and lands on the record
- [x] org-02 the Organizations list finds it and its row opens the record
- [x] org-03 Add person creates a contact attached to the organization
- [x] org-04 a timeline note lands in the history and the History tab lists the creation
- [x] org-05 the street is edited inline
- [x] org-06 the Deals tab opens a deal for the organization's contact and lists it
- [x] org-07 admin deletes the organization

---

## Journey 6: Deals (9 checkpoints) — `journeys/06-deals.spec.ts`

**Source files:** `app/platform/[tenantKey]/deals/page.tsx`, `app/platform/[tenantKey]/deals/[id]/page.tsx`, `components/crm/deals/deal-dialog.tsx`, `components/crm/deals/deal-board.tsx`, `components/crm/deals/deal-card.tsx`, `components/crm/deals/deals-table.tsx`, `components/crm/deals/lost-dialog.tsx`, `components/crm/deals/stage-stepper.tsx`, `components/crm/deals/owner-avatar.tsx`, `components/crm/deals/owner-filter.tsx`, `components/crm/deals/use-lookups.ts`

- [x] deal-01 admin creates a deal for a person from the Deals page
- [x] deal-02 the board shows the new deal in the first stage
- [x] deal-03 the card's menu moves the deal to the next stage
- [x] deal-04 the Table layout lists the deal and the choice survives a reload
- [x] deal-05 the deal page moves, loses, reopens and wins the deal
- [x] deal-06 the Activity tab logs a call on the deal
- [x] deal-07 the History tab records the stage changes
- [x] deal-08 the board's owner filter narrows the request
- [x] deal-09 admin deletes the deal

---

## Journey 7: Activities (9 checkpoints) — `journeys/07-activities.spec.ts`

**Source files:** `app/platform/[tenantKey]/activities/page.tsx`, `components/crm/activities/activity-dialog.tsx`, `components/crm/activity-icon.tsx`, `lib/crm/activities.ts`

- [x] act-01 admin schedules a task for a person from the Activities page
- [x] act-02 the task is listed under Upcoming for tomorrow
- [x] act-03 the owner scope switches between Mine and Everyone
- [x] act-04 the status filter asks for done, open or every activity
- [x] act-05 the date range narrows the schedule window
- [x] act-06 the dashboard's Up next lists the task
- [x] act-07 the row's Edit button renames the task
- [x] act-08 Mark as done moves the task to the Done section
- [x] act-09 admin deletes the task

---

## Journey 8: Tags (5 checkpoints) — `journeys/08-tags.spec.ts`

**Source files:** `app/platform/[tenantKey]/tags/page.tsx`, `components/crm/tags/tag-dialog.tsx`, `components/crm/tags/tag-color-picker.tsx`

- [x] tag-01 admin creates a tag from the Tags page
- [x] tag-02 the search finds the tag and says when nothing matches
- [x] tag-03 the colour picker recolours the tag
- [x] tag-04 the People list filters by the tag
- [x] tag-05 admin deletes the tag

---

## Journey 9: Saved Views (6 checkpoints) — `journeys/09-saved-views.spec.ts`

**Source files:** `components/crm/view-bar.tsx`, `components/crm/simple-select.tsx`, `lib/crm/views.ts`

- [x] view-01 admin sorts by name and saves the list as a view
- [x] view-02 switching to All clears the sort and the view brings it back
- [x] view-03 a lifecycle filter is saved into the view
- [x] view-04 the Columns picker hides the job title column
- [x] view-05 Clear filters drops the filter chips
- [x] view-06 admin deletes the view

---

## Journey 10: Settings (7 checkpoints) — `journeys/10-settings.spec.ts`

**Source files:** `app/platform/[tenantKey]/settings/page.tsx`, `components/crm/settings/pipelines-tab.tsx`, `components/crm/settings/lead-sources-tab.tsx`, `components/crm/settings/about-tab.tsx`, `components/crm/settings/utils.ts`, `lib/crm/permissions.ts`

- [x] set-01 the tabs switch with the ?tab= query
- [x] set-02 admin creates a pipeline and adds two stages
- [x] set-03 Make default marks the pipeline and the original is restored
- [x] set-04 admin deletes a stage
- [x] set-05 admin deletes the pipeline
- [x] set-06 admin creates and deletes a lead source
- [x] set-07 About shows the organization key and the CRM roles, and Manage roles opens Management

---

## Journey 11: Home Dashboard (5 checkpoints) — `journeys/11-dashboard.spec.ts`

**Source files:** `app/platform/[tenantKey]/page.tsx`, `components/crm/dashboard/deals-by-stage-chart.tsx`, `components/crm/dashboard/onboarding-card.tsx`, `components/crm/dashboard/panel.tsx`, `components/crm/dashboard/recent-lists.tsx`, `components/crm/dashboard/up-next-list.tsx`, `components/crm/dashboard/use-dashboard-data.ts`, `components/crm/dashboard/won-lost-chart.tsx`, `components/crm/stat-card.tsx`, `components/crm/info-tip.tsx`

- [x] dash-01 admin sees the six stat cards
- [x] dash-02 the period select asks the overview for that window
- [x] dash-03 the header actions open the deal, activity and person dialogs
- [x] dash-04 the panels render with their links
- [x] dash-05 an organization without records gets the onboarding card

---

## Journey 12: Notifications (2 checkpoints) — `journeys/12-notifications.spec.ts`

**Source files:** `app/platform/[tenantKey]/notifications/[[...id]]/page.tsx`

- [x] notif-01 the footer's Notifications opens the inbox page with the SDK panel
- [x] notif-02 the bell's dropdown links to the inbox

---

## Journey 13: Member View (6 checkpoints) — `journeys/13-member-view.spec.ts`

**Source files:** `app/platform/[tenantKey]/layout.tsx`, `components/crm/admin-mode-switch.tsx`, `lib/crm/permissions.ts`

- [x] mem-01 member lands on home with the six rows
- [x] mem-02 member sees no Settings, no Admin mode switch and no Management
- [x] mem-03 /settings sends the member home
- [x] mem-04 member creates and deletes a person
- [x] mem-05 the member's profile menu has no Account item
- [x] mem-06 ⌘K's Settings item bounces the member home

---

## Journey 14: Mobile View (7 checkpoints) — `journeys/14-mobile-view.spec.ts`

**Source files:** `app/platform/[tenantKey]/page.tsx`, `app/platform/[tenantKey]/people/page.tsx`, `app/platform/[tenantKey]/organizations/page.tsx`, `app/platform/[tenantKey]/deals/page.tsx`, `app/platform/[tenantKey]/activities/page.tsx`, `app/platform/[tenantKey]/tags/page.tsx`, `app/platform/[tenantKey]/settings/page.tsx`, `app/platform/[tenantKey]/notifications/[[...id]]/page.tsx`, `components/crm/app-sidebar.tsx`, `components/crm/top-bar.tsx`, `components/crm/organizations/organization-dialog.tsx`

- [x] mob-01 every page fits a phone without sideways overflow
- [x] mob-02 the sidebar sheet reaches People and closes
- [x] mob-03 the sheet's Search gives way to the search palette
- [x] mob-04 the dashboard actions are in view and open their dialog
- [x] mob-05 a tall dialog scrolls to its submit button on a short screen
- [x] mob-06 the home page scrolls as one document under a touch on its header
- [x] mob-07 the sheet carries the language select and the Admin mode switch

---

## Journey 15: Error States (4 checkpoints) — `journeys/15-error-states.spec.ts`

**Source files:** `app/platform/[tenantKey]/people/[id]/page.tsx`, `app/platform/[tenantKey]/organizations/[id]/page.tsx`, `app/platform/[tenantKey]/deals/[id]/page.tsx`, `components/crm/empty-state.tsx`, `components/crm/load-error.tsx`, `lib/crm/api.ts`, `lib/crm/errors.ts`

- [x] err-01 an unknown person shows the not-found state
- [x] err-02 an unknown organization shows the not-found state
- [x] err-03 an unknown deal shows Deal not found
- [x] err-04 a failing list and a refused write surface their messages

---

## Journey 16: UI Render Console Errors (2 checkpoints) — `journeys/16-ui-render-console-errors.spec.ts`

**Source files:** `app/platform/[tenantKey]/page.tsx`, `app/platform/[tenantKey]/people/page.tsx`, `app/platform/[tenantKey]/organizations/page.tsx`, `app/platform/[tenantKey]/deals/page.tsx`, `app/platform/[tenantKey]/activities/page.tsx`, `app/platform/[tenantKey]/tags/page.tsx`, `app/platform/[tenantKey]/settings/page.tsx`, `app/platform/[tenantKey]/notifications/[[...id]]/page.tsx`

- [x] con-01 every page renders for the admin without console errors
- [x] con-02 every page renders for the member without console errors

---

## Journey 17: Accessibility (1 checkpoints) — `journeys/17-accessibility-wcag.spec.ts`

**Source files:** `app/platform/[tenantKey]/page.tsx`, `app/platform/[tenantKey]/people/page.tsx`, `app/platform/[tenantKey]/organizations/page.tsx`, `app/platform/[tenantKey]/deals/page.tsx`, `app/platform/[tenantKey]/activities/page.tsx`, `app/platform/[tenantKey]/tags/page.tsx`, `app/platform/[tenantKey]/settings/page.tsx`, `app/platform/[tenantKey]/notifications/[[...id]]/page.tsx`

- [x] a11y-01 every page has no serious or critical axe violations

---

## Journey 18: Sample Data (6 checkpoints) — `journeys/18-sample-data.spec.ts`

**Source files:** `app/platform/[tenantKey]/page.tsx`, `app/platform/[tenantKey]/people/page.tsx`, `app/platform/[tenantKey]/people/[id]/page.tsx`, `app/platform/[tenantKey]/organizations/page.tsx`, `app/platform/[tenantKey]/deals/page.tsx`, `app/platform/[tenantKey]/activities/page.tsx`, `app/platform/[tenantKey]/tags/page.tsx`, `components/crm/sample-notice.tsx`, `components/crm/upgrade-modal.tsx`, `lib/crm/sample/respond.ts`, `lib/crm/permissions.ts`

- [x] smp-01 home carries the sample notice and the sample's recent deals
- [x] smp-02 People lists the sample people and a person's record opens
- [x] smp-03 Organizations, Deals, Activities and Tags show the sample's rows
- [x] smp-04 creating a person opens the upgrade dialog and reaches no platform
- [x] smp-05 the sample grants no admin surface: no Settings row, no Admin mode switch
- [x] smp-06 the upgrade dialog's Upgrade for free opens the CRM's $0 checkout (skips until web-containers carries `checkoutUrl`, iblai-web-frontend#2195)

---
