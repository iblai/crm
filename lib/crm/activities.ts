import { addDays, endOfDay, endOfWeek, isSameDay, startOfDay, startOfWeek } from "date-fns";
import type { Activity, ActivityListParams } from "./types";

export type Range = "all" | "overdue" | "today" | "week" | "next7";

export const RANGE_OPTIONS: readonly Range[] = ["overdue", "today", "week", "next7", "all"];

/** Translate the quick-range picker into the API's `schedule_from` window. */
export function rangeParams(range: Range, now = new Date()): Partial<ActivityListParams> {
  switch (range) {
    case "overdue":
      return { schedule_from__lte: now.toISOString(), is_done: false };
    case "today":
      return {
        schedule_from__gte: startOfDay(now).toISOString(),
        schedule_from__lte: endOfDay(now).toISOString(),
      };
    case "week":
      return {
        schedule_from__gte: startOfWeek(now, { weekStartsOn: 1 }).toISOString(),
        schedule_from__lte: endOfWeek(now, { weekStartsOn: 1 }).toISOString(),
      };
    case "next7":
      return {
        schedule_from__gte: now.toISOString(),
        schedule_from__lte: endOfDay(addDays(now, 7)).toISOString(),
      };
    default:
      return {};
  }
}

export interface Grouped {
  overdue: Activity[];
  today: Activity[];
  upcoming: Activity[];
  unscheduled: Activity[];
  done: Activity[];
}

/** Bucket activities the way a rep reads them: late, today, ahead, someday, history. */
export function groupActivities(rows: Activity[], now = new Date()): Grouped {
  const dayStart = startOfDay(now).getTime();
  const out: Grouped = { overdue: [], today: [], upcoming: [], unscheduled: [], done: [] };
  for (const a of rows) {
    if (a.is_done) {
      out.done.push(a);
      continue;
    }
    if (!a.schedule_from) {
      out.unscheduled.push(a);
      continue;
    }
    const at = new Date(a.schedule_from);
    if (Number.isNaN(at.getTime())) {
      out.unscheduled.push(a);
    } else if (isSameDay(at, now)) {
      out.today.push(a);
    } else if (at.getTime() < dayStart) {
      out.overdue.push(a);
    } else {
      out.upcoming.push(a);
    }
  }
  const byScheduleAsc = (a: Activity, b: Activity) =>
    new Date(a.schedule_from ?? 0).getTime() - new Date(b.schedule_from ?? 0).getTime();
  out.overdue.sort(byScheduleAsc);
  out.today.sort(byScheduleAsc);
  out.upcoming.sort(byScheduleAsc);
  out.unscheduled.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  out.done.sort(
    (a, b) =>
      new Date(b.done_at ?? b.updated_at).getTime() - new Date(a.done_at ?? a.updated_at).getTime(),
  );
  return out;
}
