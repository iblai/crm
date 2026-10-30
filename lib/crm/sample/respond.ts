/**
 * The sample's answers to the CRM slice's reads (`lib/crm/api.ts` routes here
 * on the community organization): the request in, the response body out — or
 * `NOT_FOUND` for an unknown record or route, or `undefined` for anything that
 * is not a read, which the seam turns into the upgrade dialog. Filters, search,
 * ordering and paging follow the DM's list parameters (`lib/crm/types.ts`).
 */
import type { Deal, Paginated, PipelineStage } from "../types";
import { buildSample, type Sample, type SampleVisitor } from "./data";

export const NOT_FOUND = Symbol("sample-not-found");

type Params = Record<string, unknown> | undefined;
type Row = Record<string, unknown>;

let cached: { key: string; sample: Sample } | null = null;

/** The day's sample for the visitor, built once per day. */
export function sampleOf(now: Date, visitor: SampleVisitor): Sample {
  const key = `${now.toISOString().slice(0, 10)}|${visitor.id}|${visitor.username}|${visitor.name ?? ""}`;
  if (cached?.key !== key) cached = { key, sample: buildSample(now, visitor) };
  return cached.sample;
}

const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));
const has = (params: Params, name: string) => params?.[name] !== undefined && params[name] !== "";

function paginate<T>(rows: T[], params: Params): Paginated<T> {
  const size = Math.max(1, Number(params?.page_size) || 20);
  const page = Math.max(1, Number(params?.page) || 1);
  return {
    count: rows.length,
    next_page: page * size < rows.length ? page + 1 : null,
    previous_page: page > 1 ? page - 1 : null,
    results: rows.slice((page - 1) * size, page * size),
  };
}

function order<T>(rows: T[], ordering: unknown, fallback: string): T[] {
  const key = str(ordering) || fallback;
  const desc = key.startsWith("-");
  const field = desc ? key.slice(1) : key;
  return [...rows].sort((a, b) => {
    const cmp = str((a as Row)[field]).localeCompare(str((b as Row)[field]), "en", {
      numeric: true,
    });
    return desc ? -cmp : cmp;
  });
}

const DAY = 86_400_000;

/** The created-at window a `date_filter` (or `custom` dates) names, or null. */
export function windowOf(params: Params, now: Date): { start: string; end: string } | null {
  const filter = str(params?.date_filter);
  const today = now.toISOString().slice(0, 10);
  if (filter === "custom" && has(params, "start_date")) {
    return { start: str(params?.start_date), end: str(params?.end_date) || today };
  }
  const days = { today: 1, "7d": 7, "30d": 30, "90d": 90 }[filter];
  if (!days) return filter === "all_time" ? { start: "0000-01-01", end: today } : null;
  return {
    start: new Date(now.getTime() - (days - 1) * DAY).toISOString().slice(0, 10),
    end: today,
  };
}

const within = (iso: string | null | undefined, w: { start: string; end: string }) =>
  !!iso && iso.slice(0, 10) >= w.start && iso.slice(0, 10) <= w.end;

interface Spec {
  /** Equality on a field of the same name. */
  equal: string[];
  /** `<field>__gte` / `<field>__lte` bounds, compared on the bound's own precision. */
  ranges: string[];
  /** Fields the whitespace-separated `search` terms must all appear in, together. */
  search: (row: Row) => string;
  /** `name` filters by containment. */
  name?: boolean;
}

function filter(rows: Row[], params: Params, spec: Spec, now: Date): Row[] {
  const terms = str(params?.search).toLowerCase().split(/\s+/).filter(Boolean);
  const window = windowOf(params, now);
  return rows.filter((row) => {
    for (const field of spec.equal) {
      if (has(params, field) && str(row[field]) !== str(params?.[field])) return false;
    }
    for (const field of spec.ranges) {
      const value = str(row[field]);
      const gte = str(params?.[`${field}__gte`]);
      const lte = str(params?.[`${field}__lte`]);
      if (gte && (!value || value.slice(0, gte.length) < gte)) return false;
      if (lte && (!value || value.slice(0, lte.length) > lte)) return false;
    }
    if (has(params, "tags")) {
      const wanted = str(params?.tags).split(",");
      const chips = (row.tags as { id: number; name: string }[] | undefined) ?? [];
      if (
        !wanted.every((w) =>
          chips.some((c) => str(c.id) === w || c.name.toLowerCase() === w.toLowerCase()),
        )
      )
        return false;
    }
    if (
      spec.name &&
      has(params, "name") &&
      !str(row.name).toLowerCase().includes(str(params?.name).toLowerCase())
    ) {
      return false;
    }
    if (
      has(params, "metadata__has_key") &&
      !(str(params?.metadata__has_key) in ((row.metadata as Row) ?? {}))
    ) {
      return false;
    }
    if (window && !within(row.created_at as string, window)) return false;
    const haystack = terms.length ? spec.search(row).toLowerCase() : "";
    return terms.every((t) => haystack.includes(t));
  });
}

function list(rows: Row[], params: Params, spec: Spec, fallback: string, now: Date) {
  return paginate(order(filter(rows, params, spec, now), params?.ordering, fallback), params);
}

const SPECS = {
  persons: {
    equal: ["lifecycle_stage", "active", "owner", "organization"],
    ranges: ["created_at"],
    search: (r: Row) =>
      `${str(r.name)} ${str(r.primary_email)} ${str(r.job_title)} ${str(r.organization_name)}`,
  },
  organizations: {
    equal: ["owner"],
    ranges: ["created_at"],
    search: (r: Row) => `${str(r.name)} ${str((r.address as Row | undefined)?.city)}`,
    name: true,
  },
  deals: {
    equal: ["status", "pipeline", "stage", "owner", "source", "person", "organization"],
    ranges: ["expected_close_date", "created_at"],
    search: (r: Row) => `${str(r.title)} ${str(r.person_name)} ${str(r.organization_name)}`,
  },
  activities: {
    equal: ["type", "is_done", "owner", "deal", "person", "organization"],
    ranges: ["schedule_from"],
    search: (r: Row) => `${str(r.title)} ${str(r.comment)} ${str(r.location)}`,
  },
  tags: { equal: [], ranges: ["created_at"], search: (r: Row) => str(r.name), name: true },
  pipelines: { equal: ["code"], ranges: [], search: (r: Row) => str(r.name), name: true },
  sources: { equal: [], ranges: [], search: (r: Row) => str(r.name) },
  favorites: {
    equal: ["person", "organization", "deal"],
    ranges: [],
    search: (r: Row) => str(r.label),
  },
  views: { equal: ["object_type"], ranges: [], search: (r: Row) => str(r.name) },
} satisfies Record<string, Spec>;

const money = (n: number) => n.toFixed(2);
const valueOf = (d: Deal) => Number(d.lead_value ?? 0);

function stageTotals(stage: PipelineStage, deals: Deal[]) {
  const total = deals.reduce((n, d) => n + valueOf(d), 0);
  return {
    stage,
    count: deals.length,
    total_value: money(total),
    weighted_value: money((total * (stage.probability ?? 0)) / 100),
  };
}

function overview(s: Sample, params: Params, now: Date) {
  const deals = has(params, "pipeline")
    ? s.deals.filter((d) => str(d.pipeline) === str(params?.pipeline))
    : s.deals;
  const open = deals.filter((d) => d.status === "open");
  const stageOf = (d: Deal) => s.pipeline.stages.find((st) => st.id === d.stage)!;
  const weighted = open.reduce((n, d) => n + (valueOf(d) * (stageOf(d).probability ?? 0)) / 100, 0);
  const month = (iso: string) => iso.slice(0, 7);
  const thisMonth = month(now.toISOString());
  const closedIn = (status: Deal["status"], key: string) =>
    deals.filter((d) => d.status === status && d.closed_at && month(d.closed_at) === key);
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - i), 1));
    return d.toISOString().slice(0, 7);
  });
  const today = now.toISOString().slice(0, 10);
  const pending = s.activities.filter((a) => !a.is_done);
  const window = windowOf(params, now);
  const result: Row = {
    persons: { count: s.people.filter((p) => p.active).length },
    organizations: { count: s.organizations.length },
    deals: {
      pipeline: s.pipeline,
      currency: "USD",
      open_count: open.length,
      pipeline_value: money(open.reduce((n, d) => n + valueOf(d), 0)),
      weighted_value: money(weighted),
      won_this_month_count: closedIn("won", thisMonth).length,
      won_this_month_value: money(closedIn("won", thisMonth).reduce((n, d) => n + valueOf(d), 0)),
      lost_this_month_count: closedIn("lost", thisMonth).length,
      lost_this_month_value: money(closedIn("lost", thisMonth).reduce((n, d) => n + valueOf(d), 0)),
      by_stage: s.pipeline.stages.map((stage) =>
        stageTotals(
          stage,
          deals.filter((d) => d.stage === stage.id),
        ),
      ),
      won_lost_by_month: months.map((key) => ({
        month: key,
        won_count: closedIn("won", key).length,
        won_value: money(closedIn("won", key).reduce((n, d) => n + valueOf(d), 0)),
        lost_count: closedIn("lost", key).length,
        lost_value: money(closedIn("lost", key).reduce((n, d) => n + valueOf(d), 0)),
      })),
    },
    activities: {
      open_count: pending.length,
      due_today: pending.filter((a) => str(a.schedule_from).slice(0, 10) === today).length,
      overdue: pending.filter((a) => str(a.schedule_from).slice(0, 10) < today).length,
    },
  };
  if (window) {
    const won = deals.filter((d) => d.status === "won" && within(d.closed_at, window));
    const lost = deals.filter((d) => d.status === "lost" && within(d.closed_at, window));
    Object.assign(result, {
      period_start_date: window.start,
      period_end_date: window.end,
      period_persons_created: s.people.filter((p) => within(p.created_at, window)).length,
      period_deals_created: deals.filter((d) => within(d.created_at, window)).length,
      period_deals_won: won.length,
      period_deals_won_value: money(won.reduce((n, d) => n + valueOf(d), 0)),
      period_deals_lost: lost.length,
      period_deals_lost_value: money(lost.reduce((n, d) => n + valueOf(d), 0)),
      period_activities_done: s.activities.filter((a) => a.is_done && within(a.done_at, window))
        .length,
    });
  }
  return result;
}

function board(s: Sample, params: Params, now: Date) {
  const limit = Math.max(1, Number(params?.limit) || 100);
  const { pipeline: _pipeline, limit: _limit, ...rest } = params ?? {};
  const deals = filter(s.deals as unknown as Row[], rest, SPECS.deals, now) as unknown as Deal[];
  return {
    pipeline: s.pipeline,
    limit,
    stages: s.pipeline.stages.map((stage) => {
      const inStage = order(
        deals.filter((d) => d.stage === stage.id),
        "-created_at",
        "-created_at",
      );
      return {
        ...stageTotals(stage, inStage),
        has_more: inStage.length > limit,
        deals: inStage.slice(0, limit),
      };
    }),
  };
}

function search(s: Sample, params: Params) {
  const q = str(params?.q).trim();
  const limit = Math.max(1, Number(params?.limit) || 5);
  const hit = (...fields: unknown[]) =>
    fields.some((f) => str(f).toLowerCase().includes(q.toLowerCase()));
  return {
    q,
    persons: s.people
      .filter((p) => hit(p.name, p.primary_email))
      .slice(0, limit)
      .map(({ id, name, primary_email, job_title, organization, lifecycle_stage }) => ({
        id,
        name,
        primary_email,
        job_title,
        organization,
        lifecycle_stage,
      })),
    organizations: s.organizations
      .filter((o) => hit(o.name))
      .slice(0, limit)
      .map(({ id, name }) => ({ id, name })),
    deals: s.deals
      .filter((d) => hit(d.title))
      .slice(0, limit)
      .map(
        ({ id, title, status, lead_value, currency, person, organization, pipeline, stage }) => ({
          id,
          title,
          status,
          lead_value,
          currency,
          person,
          organization,
          pipeline,
          stage,
        }),
      ),
  };
}

const found = <T>(row: T | undefined): T | typeof NOT_FOUND => row ?? NOT_FOUND;

/** The sample's answer to a slice request (see the module comment). */
export function sampleResponse(
  method: string,
  url: string,
  params: Params,
  { now, visitor }: { now: Date; visitor: SampleVisitor },
): unknown {
  if (method.toUpperCase() !== "GET") return undefined;
  const s = sampleOf(now, visitor);
  const path = url.split("?")[0];
  const rows = <T>(r: T[]) => r as unknown as Row[];
  let m: RegExpMatchArray | null;

  if (path === "/persons/") return list(rows(s.people), params, SPECS.persons, "-created_at", now);
  if ((m = path.match(/^\/persons\/([^/]+)\/history\/$/))) return found(s.history.person.get(m[1]));
  if ((m = path.match(/^\/persons\/([^/]+)\/$/)))
    return found(s.people.find((p) => p.id === m![1]));
  if (path === "/search/") return search(s, params);
  if (path === "/overview/") return overview(s, params, now);
  if (path === "/organizations/")
    return list(rows(s.organizations), params, SPECS.organizations, "name", now);
  if ((m = path.match(/^\/organizations\/([^/]+)\/history\/$/)))
    return found(s.history.organization.get(m[1]));
  if ((m = path.match(/^\/organizations\/([^/]+)\/$/)))
    return found(s.organizations.find((o) => o.id === m![1]));
  if (path === "/pipelines/") return list(rows([s.pipeline]), params, SPECS.pipelines, "name", now);
  if ((m = path.match(/^\/pipelines\/(\d+)\/stages\/$/))) {
    return Number(m[1]) === s.pipeline.id ? paginate(s.pipeline.stages, params) : NOT_FOUND;
  }
  if ((m = path.match(/^\/pipelines\/(\d+)\/$/)))
    return Number(m[1]) === s.pipeline.id ? s.pipeline : NOT_FOUND;
  if (path === "/lead-sources/") return list(rows(s.sources), params, SPECS.sources, "name", now);
  if (path === "/deals/") return list(rows(s.deals), params, SPECS.deals, "-created_at", now);
  if (path === "/deals/board/") return board(s, params, now);
  if ((m = path.match(/^\/deals\/(\d+)\/history\/$/)))
    return found(s.history.deal.get(Number(m[1])));
  if ((m = path.match(/^\/deals\/(\d+)\/$/)))
    return found(s.deals.find((d) => d.id === Number(m![1])));
  if (path === "/activities/")
    return list(rows(s.activities), params, SPECS.activities, "schedule_from", now);
  if ((m = path.match(/^\/activities\/(\d+)\/$/)))
    return found(s.activities.find((a) => a.id === Number(m![1])));
  if (path === "/tags/") return list(rows(s.tags), params, SPECS.tags, "name", now);
  if (path === "/favorites/")
    return list(rows(s.favorites), params, SPECS.favorites, "-created_at", now);
  if (path === "/views/") return list(rows(s.views), params, SPECS.views, "name", now);
  return NOT_FOUND;
}
