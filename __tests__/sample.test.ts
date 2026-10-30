import { describe, expect, it } from "vitest";
import { buildSample } from "../lib/crm/sample/data";
import { NOT_FOUND, sampleOf, sampleResponse, windowOf } from "../lib/crm/sample/respond";

const now = new Date("2026-10-15T12:00:00Z");
const visitor = { id: 42, username: "jane", name: "Jane Doe" };
const env = { now, visitor };
type Page = {
  count: number;
  next_page: number | null;
  previous_page: number | null;
  results: Record<string, unknown>[];
};
const get = (url: string, params?: Record<string, unknown>) =>
  sampleResponse("GET", url, params, env);
const page = (url: string, params?: Record<string, unknown>) => get(url, params) as Page;
const s = sampleOf(now, visitor);

describe("the CRM sample", () => {
  it("is deterministic for a day and a visitor, and the visitor owns part of it", () => {
    expect(JSON.stringify(buildSample(now, visitor))).toBe(
      JSON.stringify(buildSample(now, visitor)),
    );
    expect(sampleOf(now, visitor)).toBe(s);
    expect(s.members[0]).toMatchObject({ id: 42, username: "jane", name: "Jane Doe" });
    expect(buildSample(now, { id: 7, username: "x" }).members[0].name).toBe("x");
    expect(s.people.some((p) => p.owner === 42)).toBe(true);
  });

  it("links every record to the others it names", () => {
    for (const d of s.deals) {
      expect(s.people.some((p) => p.id === d.person)).toBe(true);
      expect(s.pipeline.stages.some((st) => st.id === d.stage)).toBe(true);
      expect(d.status === "open" ? d.closed_at === null : !!d.closed_at).toBe(true);
    }
    expect(s.deals.filter((d) => d.status === "won").length).toBeGreaterThan(0);
    expect(s.deals.filter((d) => d.status === "lost").every((d) => d.lost_reason)).toBe(true);
    expect(s.deals.some((d) => d.is_stale)).toBe(true);
  });
});

describe("sampleResponse — lists", () => {
  it("pages, orders and searches people", () => {
    const first = page("/persons/", { page_size: 10 });
    expect(first).toMatchObject({ count: s.people.length, next_page: 2, previous_page: null });
    expect(first.results).toHaveLength(10);
    const last = page("/persons/", { page: 3, page_size: 10 });
    expect(last).toMatchObject({ next_page: null, previous_page: 2 });
    const byName = page("/persons/", { ordering: "name", page_size: 100 }).results.map(
      (r) => r.name,
    );
    expect(byName).toEqual([...byName].sort((a, b) => String(a).localeCompare(String(b), "en")));
    expect(page("/persons/", { search: "ava thompson" }).count).toBe(1);
    expect(page("/persons/", { search: "alder" }).count).toBeGreaterThan(1);
  });

  it("filters people by stage, owner, organization, tag, flag and dates", () => {
    const org = s.organizations[0].id;
    expect(
      page("/persons/", { lifecycle_stage: "customer" }).results.every(
        (r) => r.lifecycle_stage === "customer",
      ),
    ).toBe(true);
    expect(
      page("/persons/", { owner: 42, page_size: 100 }).results.every((r) => r.owner === 42),
    ).toBe(true);
    expect(
      page("/persons/", { organization: org }).results.every((r) => r.organization === org),
    ).toBe(true);
    expect(page("/persons/", { tags: "1" }).count).toBeGreaterThan(0);
    expect(page("/persons/", { tags: "enterprise" }).count).toBe(
      page("/persons/", { tags: "1" }).count,
    );
    expect(page("/persons/", { active: false }).count).toBe(0);
    const recent = page("/persons/", { created_at__gte: "2026-10-01", page_size: 100 });
    expect(recent.results.every((r) => String(r.created_at) >= "2026-10-01")).toBe(true);
    const old = page("/persons/", { created_at__lte: "2026-01-01", page_size: 100 });
    expect(old.count).toBeGreaterThan(0);
    expect(page("/persons/", { metadata__has_key: "nothing" }).count).toBe(0);
  });

  it("windows a list by date_filter", () => {
    expect(windowOf({ date_filter: "today" }, now)).toEqual({
      start: "2026-10-15",
      end: "2026-10-15",
    });
    expect(windowOf({ date_filter: "7d" }, now)).toEqual({
      start: "2026-10-09",
      end: "2026-10-15",
    });
    expect(windowOf({ date_filter: "all_time" }, now)?.start).toBe("0000-01-01");
    expect(windowOf({ date_filter: "custom", start_date: "2026-10-01" }, now)).toEqual({
      start: "2026-10-01",
      end: "2026-10-15",
    });
    expect(
      windowOf({ date_filter: "custom", start_date: "2026-10-01", end_date: "2026-10-05" }, now)
        ?.end,
    ).toBe("2026-10-05");
    expect(windowOf({}, now)).toBeNull();
    expect(page("/persons/", { date_filter: "7d", page_size: 100 }).count).toBeLessThan(
      s.people.length,
    );
  });

  it("lists organizations by name and tag, deals by every filter, activities by owner and state", () => {
    expect(page("/organizations/", { name: "alder" }).count).toBe(1);
    expect(page("/organizations/").results[0].name).toBe("Alder Health");
    expect(page("/organizations/", { tags: "1" }).count).toBeGreaterThan(1);
    const open = page("/deals/", { status: "open", pipeline: 1, page_size: 100 });
    expect(open.results.every((r) => r.status === "open")).toBe(true);
    expect(page("/deals/", { stage: 15 }).results.every((r) => r.stage === 15)).toBe(true);
    expect(
      page("/deals/", { expected_close_date__lte: "2026-10-20", status: "open" }).count,
    ).toBeGreaterThan(0);
    expect(page("/deals/", { search: "renewal" }).count).toBe(1);
    const mine = page("/activities/", { owner: 42, is_done: false, page_size: 100 });
    expect(mine.count).toBeGreaterThan(0);
    expect(mine.results.every((r) => r.owner === 42 && r.is_done === false)).toBe(true);
    const sorted = page("/activities/", { page_size: 100 }).results.map((r) =>
      String(r.schedule_from),
    );
    expect(sorted).toEqual([...sorted].sort());
    expect(page("/activities/", { type: "call" }).results.every((r) => r.type === "call")).toBe(
      true,
    );
    expect(
      page("/activities/", {
        schedule_from__gte: "2026-10-15",
        schedule_from__lte: "2026-10-15T23:59:59Z",
      }).count,
    ).toBeGreaterThan(0);
  });

  it("lists tags, pipelines, stages, sources, favorites and saved views", () => {
    expect(page("/tags/", { page_size: 100 }).count).toBe(6);
    expect(page("/tags/", { name: "part" }).count).toBe(1);
    expect(page("/pipelines/", { page_size: 100 }).results[0]).toMatchObject({
      code: "sales",
      is_default: true,
    });
    expect(page("/pipelines/", { code: "other" }).count).toBe(0);
    expect(page("/pipelines/1/stages/", { page_size: 100 }).count).toBe(6);
    expect(page("/lead-sources/", { page_size: 100 }).count).toBe(4);
    expect(page("/favorites/", { page_size: 100 }).count).toBe(3);
    expect(page("/favorites/", { person: s.people[0].id }).count).toBe(1);
    expect(page("/views/", { object_type: "deals" }).results[0]).toMatchObject({ type: "kanban" });
  });
});

describe("sampleResponse — records, history and the derived reads", () => {
  it("answers a record by id and says not found for any other", () => {
    expect(get(`/persons/${s.people[0].id}/`)).toBe(s.people[0]);
    expect(get(`/organizations/${s.organizations[1].id}/`)).toBe(s.organizations[1]);
    expect(get("/deals/101/")).toMatchObject({ id: 101 });
    expect(get("/activities/201/")).toMatchObject({ id: 201 });
    expect(get("/pipelines/1/")).toBe(s.pipeline);
    for (const url of [
      "/persons/nope/",
      "/organizations/nope/",
      "/deals/1/",
      "/activities/1/",
      "/pipelines/2/",
      "/pipelines/2/stages/",
      "/unknown/",
    ]) {
      expect(get(url)).toBe(NOT_FOUND);
    }
  });

  it("answers each record's history", () => {
    const person = get(`/persons/${s.people[0].id}/history/`) as { action: string }[];
    expect(person.map((e) => e.action)).toEqual(["update", "create"]);
    expect((get(`/persons/${s.people[4].id}/history/`) as unknown[]).length).toBe(1);
    expect((get(`/organizations/${s.organizations[0].id}/history/`) as unknown[]).length).toBe(1);
    expect((get("/deals/101/history/") as { changes: unknown }[])[0].changes).toMatchObject({
      stage: ["Lead", "Negotiation"],
    });
    expect(get("/deals/1/history/")).toBe(NOT_FOUND);
  });

  it("derives the overview for this month and for a period", () => {
    const month = get("/overview/") as Record<string, any>;
    expect(month.persons.count).toBe(s.people.length);
    expect(month.deals.open_count).toBe(s.deals.filter((d) => d.status === "open").length);
    expect(Number(month.deals.weighted_value)).toBeLessThan(Number(month.deals.pipeline_value));
    expect(month.deals.by_stage).toHaveLength(6);
    expect(month.deals.won_lost_by_month.map((m: { month: string }) => m.month)).toEqual([
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
    expect(month.deals.won_this_month_count).toBeGreaterThan(0);
    expect(month.activities.due_today).toBeGreaterThan(0);
    expect(month.activities.overdue).toBeGreaterThan(0);
    expect(month.period_start_date).toBeUndefined();
    const week = get("/overview/", { date_filter: "30d", pipeline: 1 }) as Record<string, any>;
    expect(week.period_start_date).toBe("2026-09-16");
    expect(week.period_deals_won).toBeGreaterThan(0);
    expect(week.period_activities_done).toBeGreaterThan(0);
    expect((get("/overview/", { pipeline: 9 }) as Record<string, any>).deals.open_count).toBe(0);
  });

  it("builds the board per stage, limited and filtered", () => {
    const board = get("/deals/board/", { pipeline: 1, limit: 1 }) as {
      stages: { count: number; has_more: boolean; deals: unknown[] }[];
    };
    expect(board.stages).toHaveLength(6);
    expect(board.stages.every((st) => st.deals.length <= 1)).toBe(true);
    expect(board.stages.some((st) => st.has_more)).toBe(true);
    const mine = get("/deals/board/", { owner: 42 }) as {
      stages: { deals: { owner: number }[] }[];
    };
    expect(mine.stages.flatMap((st) => st.deals).every((d) => d.owner === 42)).toBe(true);
  });

  it("searches people, organizations and deals", () => {
    const hits = get("/search/", { q: "alder", limit: 2 }) as Record<string, unknown[]>;
    expect(hits.organizations).toHaveLength(1);
    expect(hits.persons.length).toBeLessThanOrEqual(2);
    expect(hits.deals.length).toBeGreaterThan(0);
    expect((get("/search/", { q: "zzz" }) as Record<string, unknown[]>).persons).toEqual([]);
  });

  it("searches within each list", () => {
    expect(page("/organizations/", { search: "lisbon" }).count).toBe(1);
    expect(page("/activities/", { search: "kick-off" }).count).toBe(1);
    expect(page("/tags/", { search: "renew" }).count).toBe(1);
    expect(page("/pipelines/", { search: "sales" }).count).toBe(1);
    expect(page("/lead-sources/", { search: "refer" }).count).toBe(1);
    expect(page("/favorites/", { search: "harborview" }).count).toBe(1);
    expect(page("/views/", { search: "closing" }).count).toBe(1);
  });

  it("counts a deal lost this month", () => {
    const late = { now: new Date("2026-10-31T12:00:00Z"), visitor };
    const month = sampleResponse("GET", "/overview/", undefined, late) as Record<string, any>;
    expect(month.deals.lost_this_month_count).toBe(1);
    expect(Number(month.deals.lost_this_month_value)).toBeGreaterThan(0);
  });

  it("is no answer for anything but a read, which the seam turns into the upgrade dialog", () => {
    for (const method of ["POST", "PATCH", "DELETE"])
      expect(sampleResponse(method, "/persons/", undefined, env)).toBeUndefined();
  });
});
