/** Env-driven constants and the data generators every journey shares. */
export const APP_HOST = process.env.APP_HOST || "http://localhost:3000";
export const MEMBER_EMAIL = process.env.PLAYWRIGHT_MEMBER_USERNAME || "";
export const MEMBER_PASSWORD = process.env.PLAYWRIGHT_MEMBER_PASSWORD || "";

/** Every record a journey creates starts with this; `utils/residue.ts` sweeps by it. */
export const E2E = "E2E";

const rand = () => Math.random().toString(36).slice(2, 6);
export const stamp = () => `${Date.now().toString(36)}-${rand()}`;
const named = (kind: string) => `${E2E} ${kind} ${stamp()}`;

export const personName = () => named("Person");
export const organizationName = () => named("Organization");
export const dealTitle = () => named("Deal");
export const activityTitle = () => named("Activity");
export const tagName = () => named("Tag");
export const pipelineName = () => named("Pipeline");
export const sourceName = () => named("Source");
export const viewName = () => named("View");

/** Strings the SDK shell renders (web-containers), not in messages/en.json. */
export const SDK = {
  nav: /^(Main navigation|Navegación principal|Navigation principale|主导航)$/,
  sheet: "Sidebar",
  profile: "More options",
  profileItem: "Profile",
  account: "Account",
  logOut: "Log Out",
  collapse: "Collapse sidebar",
  expand: "Expand sidebar",
  viewAll: "View all",
  management: "Management",
  integrations: "Integrations",
  advanced: "Advanced",
  support: "Support",
  inboxTab: "Inbox tab",
} as const;

/** The pages under `/platform/<org>` and their h1, for the sweeps (phone, console, axe). */
export const PAGES: ReadonlyArray<readonly [path: string, title: string]> = [
  ["", "Home"],
  ["/people", "People"],
  ["/organizations", "Organizations"],
  ["/deals", "Deals"],
  ["/activities", "Activities"],
  ["/tags", "Tags"],
  ["/settings", "Settings"],
  ["/notifications", "Notifications"],
];

/** The same without Settings, which a member never reaches. */
export const MEMBER_PAGES = PAGES.filter(([path]) => path !== "/settings");

/** Tomorrow at 10:00 local, in the `datetime-local` wire format. */
export function tomorrowAtTen(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T10:00`;
}
