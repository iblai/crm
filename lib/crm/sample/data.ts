/**
 * The CRM's sample data on the community organization: fictional people,
 * organizations, deals and activities a visitor browses before they have an
 * organization of their own (`./respond.ts` answers the reads from it).
 * Deterministic; dates sit relative to `now` so "due today" and "this month"
 * stay true, and the visitor owns a share of the records so "Mine" lists fill.
 */
import type {
  Activity,
  ActivityType,
  Deal,
  Favorite,
  HistoryEntry,
  LeadSource,
  LifecycleStage,
  Organization,
  Person,
  Pipeline,
  PipelineStage,
  PlatformMember,
  SavedView,
  Tag,
  TagChip,
} from "../types";

/** The visitor, who owns a quarter of the sample. */
export interface SampleVisitor {
  id: number;
  username: string;
  name?: string;
}

export interface Sample {
  members: PlatformMember[];
  tags: Tag[];
  sources: LeadSource[];
  pipeline: Pipeline;
  organizations: Organization[];
  people: Person[];
  deals: Deal[];
  activities: Activity[];
  favorites: Favorite[];
  views: SavedView[];
  history: {
    person: Map<string, HistoryEntry[]>;
    organization: Map<string, HistoryEntry[]>;
    deal: Map<number, HistoryEntry[]>;
  };
}

const PLATFORM = 1;
const DAY = 86_400_000;
const DOMAIN = "example.com";

const TAGS: [string, string][] = [
  ["Enterprise", "#7c3aed"],
  ["Priority", "#dc2626"],
  ["Partner", "#0891b2"],
  ["Renewal", "#059669"],
  ["Inbound", "#0058cc"],
  ["Event", "#ea580c"],
];

const SOURCES: [string, string][] = [
  ["Website", "website"],
  ["Referral", "referral"],
  ["Event", "event"],
  ["Outbound", "outbound"],
];

/** code, name, probability, won, lost */
const STAGES: [string, string, number, boolean, boolean][] = [
  ["lead", "Lead", 10, false, false],
  ["qualified", "Qualified", 25, false, false],
  ["proposal", "Proposal", 50, false, false],
  ["negotiation", "Negotiation", 75, false, false],
  ["won", "Won", 100, true, false],
  ["lost", "Lost", 0, false, true],
];

/** name, city, state, country, owner slot (0 = the visitor), tag ids, created days ago */
const ORGS: [string, string, string, string, number, number[], number][] = [
  ["Alder Health", "Portland", "OR", "United States", 0, [1], 240],
  ["Bluewater Logistics", "Rotterdam", "", "Netherlands", 1, [3], 200],
  ["Cobalt Learning", "Austin", "TX", "United States", 2, [5], 150],
  ["Driftwood Hotels", "Lisbon", "", "Portugal", 3, [1, 4], 320],
  ["Evergreen Foods", "Toronto", "ON", "Canada", 0, [], 90],
  ["Foxglove Media", "London", "", "United Kingdom", 1, [6], 280],
  ["Granite Works", "Denver", "CO", "United States", 2, [2], 110],
  ["Harborview Clinics", "Seattle", "WA", "United States", 3, [1, 2], 75],
];

/** name, job title, organization (index, -1 none), lifecycle, owner slot, tag ids, created days ago */
const PEOPLE: [string, string, number, LifecycleStage, number, number[], number][] = [
  ["Ava Thompson", "Head of Operations", 0, "customer", 0, [1], 210],
  ["Noah Fischer", "IT Director", 0, "opportunity", 0, [], 120],
  ["Priya Raman", "Procurement Lead", 1, "qualified", 1, [3], 95],
  ["Lucas Moreau", "Chief Operating Officer", 1, "opportunity", 1, [2], 80],
  ["Hana Sato", "Program Manager", 2, "lead", 2, [5], 12],
  ["Mateo Rossi", "Learning Director", 2, "qualified", 2, [5], 40],
  ["Chloé Martin", "General Manager", 3, "customer", 3, [4], 300],
  ["Omar Haddad", "Revenue Manager", 3, "opportunity", 3, [], 60],
  ["Grace Liu", "Category Manager", 4, "lead", 0, [6], 5],
  ["Ethan Brooks", "VP Supply Chain", 4, "qualified", 0, [], 33],
  ["Zoe Adams", "Creative Director", 5, "opportunity", 1, [6], 45],
  ["Samuel Okoye", "Head of Partnerships", 5, "customer", 1, [3], 260],
  ["Isla Novak", "Plant Manager", 6, "lead", 2, [2], 8],
  ["Benjamin Clarke", "Chief Financial Officer", 6, "qualified", 2, [], 70],
  ["Mia Johansson", "Clinic Director", 7, "opportunity", 3, [1], 50],
  ["Daniel Reyes", "Practice Manager", 7, "customer", 3, [4], 180],
  ["Layla Hassan", "Independent Consultant", -1, "lead", 0, [5], 3],
  ["Jack Murphy", "Founder", -1, "churned", 1, [], 400],
  ["Elena Petrova", "Operations Analyst", 1, "lead", 1, [], 20],
  ["Henry Walker", "Facilities Lead", 6, "qualified", 2, [], 28],
  ["Sara Lindqvist", "Marketing Lead", 5, "lead", 1, [5], 2],
  ["Kenji Watanabe", "IT Manager", 2, "opportunity", 2, [], 55],
  ["Fatima Diallo", "Finance Director", 3, "qualified", 3, [1], 38],
  ["Leo Bauer", "Buyer", 4, "churned", 0, [], 350],
];

/**
 * title, value, stage index, person index, source index, owner slot, tag ids,
 * created days ago, days to the expected close (open) or since closing (won, lost), lost reason
 */
const DEALS: [string, number, number, number, number, number, number[], number, number, string?][] =
  [
    ["Patient portal rollout", 48000, 3, 1, 1, 0, [1, 2], 60, 12],
    ["Fleet analytics", 32000, 2, 3, 3, 1, [2], 45, 25],
    ["Course platform", 18500, 1, 5, 0, 2, [5], 30, 40],
    ["Guest experience suite", 27000, 4, 6, 1, 3, [4], 90, 6],
    ["Supplier portal", 15000, 0, 9, 2, 0, [6], 10, 60],
    ["Content workflow", 22000, 3, 10, 2, 1, [6], 50, 7],
    ["Maintenance tracker", 12500, 2, 13, 3, 2, [], 35, 18],
    ["Scheduling upgrade", 39000, 1, 14, 0, 3, [1], 25, 30],
    ["Annual renewal", 21000, 4, 0, 1, 0, [4], 120, 20],
    ["Customs integration", 9500, 5, 2, 3, 1, [], 70, 15, "Chose an in-house build"],
    ["Analytics add-on", 7200, 0, 21, 0, 2, [], 7, 45],
    ["Revenue reporting", 16800, 2, 7, 1, 3, [], 40, 20],
    ["Partner program", 30000, 4, 11, 1, 1, [3], 150, 45],
    ["Safety training", 8400, 5, 19, 2, 2, [], 100, 50, "Budget moved to next year"],
    ["Telehealth pilot", 26000, 3, 15, 0, 3, [1, 2], 30, 5],
    ["Advisory retainer", 6000, 1, 16, 0, 0, [5], 4, 30],
  ];

/** title, type, person index (-1 none), deal index (-1 none), owner slot, day offset, hour, done */
const ACTIVITIES: [string, ActivityType, number, number, number, number, number, boolean][] = [
  ["Kick-off call", "call", 1, 0, 0, -20, 10, true],
  ["Security review", "meeting", 1, 0, 0, -6, 14, true],
  ["Send the revised proposal", "email", 1, 0, 0, -2, 9, false],
  ["Contract walkthrough", "meeting", 1, 0, 0, 0, 15, false],
  ["Discovery call", "call", 3, 1, 1, -14, 11, true],
  ["Pricing follow-up", "email", 3, 1, 1, 0, 10, false],
  ["Demo for the operations team", "meeting", 3, 1, 1, 3, 13, false],
  ["Intro call", "call", 5, 2, 2, -9, 16, true],
  ["Share the course catalogue", "task", 5, 2, 2, 2, 9, false],
  ["Lunch with the revenue team", "lunch", 7, 11, 3, -1, 12, false],
  ["Quarterly business review", "meeting", 6, 3, 3, -12, 10, true],
  ["Supplier workshop", "meeting", 9, 4, 0, 5, 14, false],
  ["Check the trade-show leads", "task", 8, -1, 0, 0, 11, false],
  ["Scope the content workflow", "call", 10, 5, 1, -8, 15, true],
  ["Procurement deadline", "deadline", 10, 5, 1, 7, 17, false],
  ["Site visit", "meeting", 13, 6, 2, -3, 10, false],
  ["Send the maintenance plan", "email", 13, 6, 2, 1, 9, false],
  ["Clinic tour", "meeting", 14, 7, 3, -5, 9, true],
  ["Scheduling requirements", "note", 14, 7, 3, -4, 16, true],
  ["Renewal sign-off", "call", 0, 8, 0, -22, 11, true],
  ["Loss review", "note", 2, 9, 1, -15, 15, true],
  ["Analytics add-on demo", "meeting", 21, 10, 2, 4, 13, false],
  ["Reporting requirements", "call", 7, 11, 3, -33, 10, true],
  ["Partner kickoff", "meeting", 11, 12, 1, -40, 14, true],
  ["Training budget call", "call", 19, 13, 2, -48, 11, true],
  ["Telehealth pilot plan", "meeting", 15, 14, 3, 0, 16, false],
  ["Pilot success criteria", "email", 15, 14, 3, -2, 9, true],
  ["Advisory scope", "call", 16, 15, 0, 6, 10, false],
  ["Welcome Sara", "email", 20, -1, 1, -1, 9, true],
  ["Follow up with Jack", "task", 17, -1, 1, 10, 9, false],
];

const pad = (n: number, width: number) => String(n).padStart(width, "0");
/** A stable UUID: `kind` 1 people, 2 organizations. */
const uuid = (kind: number, n: number) => `5a3e${pad(kind, 4)}-0000-4000-8000-${pad(n, 12)}`;
const emailOf = (name: string, domain: string) =>
  `${name
    .normalize("NFD")
    .replace(/[^\p{L} ]/gu, "")
    .toLowerCase()
    .replace(/ /g, ".")}@${domain}`;
const domainOf = (org: string) => `${org.toLowerCase().replace(/[^a-z]/g, "")}.${DOMAIN}`;

const FELLOWS: PlatformMember[] = [
  { id: 9002, username: "daniel.okafor", email: `daniel.okafor@${DOMAIN}`, name: "Daniel Okafor" },
  { id: 9003, username: "sofia.marin", email: `sofia.marin@${DOMAIN}`, name: "Sofía Marín" },
  { id: 9004, username: "liam.walsh", email: `liam.walsh@${DOMAIN}`, name: "Liam Walsh" },
];

/** The sample's owners: the visitor first, then three fictional colleagues. */
export function sampleMembers(visitor: SampleVisitor): PlatformMember[] {
  return [
    { id: visitor.id, username: visitor.username, name: visitor.name || visitor.username },
    ...FELLOWS,
  ];
}

/** The sample for `now`'s day, owned in part by `visitor`. */
export function buildSample(now: Date, visitor: SampleVisitor): Sample {
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const at = (days: number, hour = 9) =>
    new Date(today.getTime() + days * DAY + hour * 3_600_000).toISOString();
  const day = (days: number) => at(days, 0).slice(0, 10);

  const members = sampleMembers(visitor);
  const owner = (slot: number) => members[slot].id;
  const ownerName = (slot: number) => members[slot].username;

  const tags: Tag[] = TAGS.map(([name, color], i) => ({
    id: i + 1,
    platform: PLATFORM,
    name,
    color,
    created_at: at(-400),
    updated_at: at(-400),
  }));
  const chips = (ids: number[]): TagChip[] =>
    ids.map((id) => ({ id, name: tags[id - 1].name, color: tags[id - 1].color ?? "" }));

  const sources: LeadSource[] = SOURCES.map(([name, code], i) => ({
    id: i + 1,
    platform: PLATFORM,
    name,
    code,
    created_at: at(-400),
    updated_at: at(-400),
  }));

  const stages: PipelineStage[] = STAGES.map(([code, name, probability, won, lost], i) => ({
    id: 11 + i,
    pipeline: 1,
    code,
    name,
    probability,
    sort_order: i + 1,
    is_won: won,
    is_lost: lost,
    created_at: at(-400),
    updated_at: at(-400),
  }));
  const pipeline: Pipeline = {
    id: 1,
    platform: PLATFORM,
    name: "Sales",
    code: "sales",
    is_default: true,
    rotten_days: 30,
    stages,
    created_at: at(-400),
    updated_at: at(-400),
  };

  const organizations: Organization[] = ORGS.map(
    ([name, city, state, country, slot, tagIds, ago], i) => ({
      id: uuid(2, i + 1),
      platform: PLATFORM,
      name,
      address: { city, ...(state ? { state } : {}), country },
      owner: owner(slot),
      tags: chips(tagIds),
      metadata: { website: `https://www.${domainOf(name)}` },
      created_at: at(-ago, 10),
      updated_at: at(-Math.floor(ago / 3), 15),
    }),
  );

  const people: Person[] = PEOPLE.map(([name, job, orgIndex, lifecycle, slot, tagIds, ago], i) => {
    const org = orgIndex >= 0 ? organizations[orgIndex] : undefined;
    const email = emailOf(name, org ? domainOf(org.name) : DOMAIN);
    return {
      id: uuid(1, i + 1),
      platform: PLATFORM,
      name,
      primary_email: email,
      emails: [email],
      contact_numbers: [`+1 555 01${pad(i + 10, 2)}`],
      job_title: job,
      organization: org?.id ?? null,
      organization_name: org?.name ?? null,
      owner: owner(slot),
      platform_user: null,
      lifecycle_stage: lifecycle,
      active: true,
      tags: chips(tagIds),
      created_at: at(-ago, 11),
      updated_at: at(-Math.floor(ago / 2), 14),
    };
  });

  const deals: Deal[] = DEALS.map(
    (
      [title, value, stageIndex, personIndex, sourceIndex, slot, tagIds, ago, days, lostReason],
      i,
    ) => {
      const person = people[personIndex];
      const stage = stages[stageIndex];
      const status = stage.is_won ? "won" : stage.is_lost ? "lost" : "open";
      const updated = status === "open" ? (ago > 35 ? -36 : -Math.min(ago, 3)) : -days;
      return {
        id: 101 + i,
        platform: PLATFORM,
        title: person.organization_name ? `${person.organization_name} — ${title}` : title,
        description: `${title} for ${person.organization_name ?? person.name}.`,
        lead_value: value.toFixed(2),
        currency: "USD",
        status,
        is_stale: status === "open" && updated < -pipeline.rotten_days!,
        ...(lostReason ? { lost_reason: lostReason } : {}),
        expected_close_date: status === "open" ? day(days) : day(-days),
        closed_at: status === "open" ? null : at(-days, 16),
        person: person.id,
        person_name: person.name,
        organization: person.organization ?? null,
        organization_name: person.organization_name ?? null,
        pipeline: pipeline.id,
        stage: stage.id,
        source: sources[sourceIndex].id,
        owner: owner(slot),
        tags: chips(tagIds),
        created_at: at(-ago, 10),
        updated_at: at(updated, 12),
      };
    },
  );

  const activities: Activity[] = ACTIVITIES.map(
    ([title, type, personIndex, dealIndex, slot, offset, hour, done], i) => {
      const person = personIndex >= 0 ? people[personIndex] : undefined;
      const deal = dealIndex >= 0 ? deals[dealIndex] : undefined;
      return {
        id: 201 + i,
        platform: PLATFORM,
        title,
        type,
        ...(type === "meeting" || type === "lunch"
          ? { location: type === "lunch" ? "Café Lumen" : "Video call" }
          : {}),
        comment: "",
        schedule_from: at(offset, hour),
        schedule_to: at(offset, hour + 1),
        is_done: done,
        done_at: done ? at(offset, hour + 1) : null,
        deal: deal?.id ?? null,
        person: person?.id ?? null,
        organization: person?.organization ?? null,
        owner: owner(slot),
        reminder_at: null,
        reminder_sent: false,
        created_at: at(Math.min(offset, 0) - 2, 9),
        updated_at: at(done ? offset : Math.min(offset, 0) - 2, hour),
      };
    },
  );

  const favorites: Favorite[] = [
    {
      id: 301,
      platform: PLATFORM,
      person: people[0].id,
      organization: null,
      deal: null,
      target_type: "person",
      label: people[0].name,
      created_at: at(-30),
    },
    {
      id: 302,
      platform: PLATFORM,
      person: null,
      organization: organizations[7].id,
      deal: null,
      target_type: "organization",
      label: organizations[7].name,
      created_at: at(-20),
    },
    {
      id: 303,
      platform: PLATFORM,
      person: null,
      organization: null,
      deal: deals[0].id,
      target_type: "deal",
      label: deals[0].title,
      created_at: at(-10),
    },
  ];

  const view = (
    id: number,
    object_type: SavedView["object_type"],
    name: string,
    rest: Partial<SavedView>,
  ): SavedView => ({
    id,
    platform: PLATFORM,
    object_type,
    name,
    type: "table",
    columns: [],
    filters: [],
    sorts: [],
    group_by: "",
    created_at: at(-60),
    updated_at: at(-60),
    ...rest,
  });
  const views: SavedView[] = [
    view(401, "persons", "Qualified people", {
      filters: [{ field: "lifecycle_stage", op: "is", value: "qualified" }],
      sorts: [{ field: "name", dir: "asc" }],
    }),
    view(402, "organizations", "Enterprise accounts", {
      filters: [{ field: "tags", op: "is", value: 1 }],
    }),
    view(403, "deals", "Closing soon", {
      type: "kanban",
      sorts: [{ field: "expected_close_date", dir: "asc" }],
    }),
    view(404, "activities", "Open calls", {
      filters: [
        { field: "type", op: "is", value: "call" },
        { field: "is_done", op: "is", value: false },
      ],
    }),
  ];

  let historyId = 500;
  const entry = (
    timestamp: string,
    action: HistoryEntry["action"],
    actor: string,
    changes: HistoryEntry["changes"] = null,
  ): HistoryEntry => ({
    id: ++historyId,
    timestamp,
    action,
    actor_username: actor,
    changes,
  });
  const slotOf = (id?: number | null) =>
    Math.max(
      0,
      members.findIndex((m) => m.id === id),
    );
  const history: Sample["history"] = {
    person: new Map(
      people.map((p) => [
        p.id,
        [
          ...(p.lifecycle_stage !== "lead"
            ? [
                entry(p.updated_at, "update", ownerName(slotOf(p.owner)), {
                  lifecycle_stage: ["lead", p.lifecycle_stage ?? "lead"],
                }),
              ]
            : []),
          entry(p.created_at, "create", ownerName(slotOf(p.owner))),
        ],
      ]),
    ),
    organization: new Map(
      organizations.map((o) => [o.id, [entry(o.created_at, "create", ownerName(slotOf(o.owner)))]]),
    ),
    deal: new Map(
      deals.map((d) => [
        d.id,
        [
          ...(d.stage !== stages[0].id
            ? [
                entry(d.updated_at, "update", ownerName(slotOf(d.owner)), {
                  stage: [stages[0].name, stages.find((s) => s.id === d.stage)!.name],
                }),
              ]
            : []),
          entry(d.created_at, "create", ownerName(slotOf(d.owner))),
        ],
      ]),
    ),
  };

  return {
    members,
    tags,
    sources,
    pipeline,
    organizations,
    people,
    deals,
    activities,
    favorites,
    views,
    history,
  };
}
