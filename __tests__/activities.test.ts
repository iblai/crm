import { describe, expect, it } from "vitest";
import { groupActivities, rangeParams } from "../lib/crm/activities";
import type { Activity } from "../lib/crm/types";

// Wednesday 2026-10-07 15:00 local.
const now = new Date(2026, 9, 7, 15, 0);

const activity = (id: number, over: Partial<Activity>): Activity =>
  ({
    id,
    title: `a${id}`,
    is_done: false,
    schedule_from: null,
    created_at: new Date(2026, 9, 1).toISOString(),
    updated_at: new Date(2026, 9, 1).toISOString(),
    ...over,
  }) as Activity;

describe("rangeParams", () => {
  it("maps each quick range to a schedule window", () => {
    expect(rangeParams("all", now)).toEqual({});
    expect(rangeParams("overdue", now)).toEqual({
      schedule_from__lte: now.toISOString(),
      is_done: false,
    });
    expect(rangeParams("today", now)).toEqual({
      schedule_from__gte: new Date(2026, 9, 7).toISOString(),
      schedule_from__lte: new Date(2026, 9, 7, 23, 59, 59, 999).toISOString(),
    });
    expect(rangeParams("week", now)).toEqual({
      schedule_from__gte: new Date(2026, 9, 5).toISOString(),
      schedule_from__lte: new Date(2026, 9, 11, 23, 59, 59, 999).toISOString(),
    });
    expect(rangeParams("next7", now)).toEqual({
      schedule_from__gte: now.toISOString(),
      schedule_from__lte: new Date(2026, 9, 14, 23, 59, 59, 999).toISOString(),
    });
  });
});

describe("groupActivities", () => {
  it("buckets by the given day, not the wall clock, and sorts each bucket", () => {
    const rows = [
      activity(1, { schedule_from: new Date(2026, 9, 9, 9).toISOString() }),
      activity(2, { schedule_from: new Date(2026, 9, 7, 9).toISOString() }),
      activity(3, { schedule_from: new Date(2026, 9, 5, 9).toISOString() }),
      activity(4, { schedule_from: new Date(2026, 9, 7, 8).toISOString() }),
      activity(5, {}),
      activity(6, { is_done: true, done_at: new Date(2026, 9, 6).toISOString() }),
      activity(7, { schedule_from: new Date(2026, 9, 8, 9).toISOString() }),
      activity(8, { schedule_from: "not a date" }),
    ];
    const g = groupActivities(rows, now);
    const ids = (list: Activity[]) => list.map((a) => a.id);
    expect(ids(g.overdue)).toEqual([3]);
    expect(ids(g.today)).toEqual([4, 2]);
    expect(ids(g.upcoming)).toEqual([7, 1]);
    expect(ids(g.unscheduled).sort()).toEqual([5, 8]);
    expect(ids(g.done)).toEqual([6]);
  });
});
