import { isPast, isToday, isTomorrow, parseISO } from "date-fns";
import type { PipelineStage, TagChip } from "./types";

/** `locale` is the active UI locale; `undefined` falls back to the browser's. */
export function formatCurrency(
  value: string | number | null | undefined,
  currency = "USD",
  locale?: string,
) {
  const n = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: n % 1 === 0 ? 0 : 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export function formatCompactCurrency(value: number, currency = "USD", locale?: string) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || "USD",
      notation: "compact",
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(0)}`;
  }
}

export function toDate(value?: string | null): Date | null {
  if (!value) return null;
  try {
    const d = parseISO(value);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function formatDate(
  value?: string | null,
  locale?: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
) {
  const d = toDate(value);
  return d ? new Intl.DateTimeFormat(locale, options).format(d) : "—";
}

export function formatDateTime(value?: string | null, locale?: string) {
  return formatDate(value, locale, { dateStyle: "medium", timeStyle: "short" });
}

export function formatTime(value?: string | null, locale?: string) {
  return formatDate(value, locale, { timeStyle: "short" });
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

/** "3 days ago", "in 2 hours", "now" — in the active locale. */
export function formatRelative(value?: string | null, locale?: string, now: Date = new Date()) {
  const d = toDate(value);
  if (!d) return "—";
  const seconds = Math.round((d.getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.trunc(seconds / size), unit);
  }
  return rtf.format(0, "second");
}

export type ScheduleKind = "unscheduled" | "today" | "tomorrow" | "overdue" | "date";

/** Where a scheduled activity stands; the caller words it (`activities.schedule.*`). */
export function scheduleState(
  value?: string | null,
  done = false,
): { kind: ScheduleKind; date: Date | null } {
  const d = toDate(value);
  if (!d) return { kind: "unscheduled", date: null };
  if (isToday(d)) return { kind: "today", date: d };
  if (isTomorrow(d)) return { kind: "tomorrow", date: d };
  if (!done && isPast(d)) return { kind: "overdue", date: d };
  return { kind: "date", date: d };
}

export function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_PALETTE = [
  "#0058cc",
  "#00b0ef",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#059669",
  "#0891b2",
  "#4f46e5",
];

/** Stable brand-palette color for an entity, from its id or name. */
export function avatarColor(seed?: string | number | null) {
  const s = String(seed ?? "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

/** Readable text color (black/white) for a hex background. */
export function contrastText(hex?: string) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return "#111827";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111827" : "#ffffff";
}

/** Soft chip styling for a tag: tinted background + strong text. */
export function tagStyle(tag: Pick<TagChip, "color">) {
  const color = tag.color && /^#[0-9a-f]{6}$/i.test(tag.color) ? tag.color : "#888888";
  return { backgroundColor: `${color}1f`, color, borderColor: `${color}55` };
}

export function sortStages<T extends Pick<PipelineStage, "sort_order" | "id">>(stages: T[]) {
  return [...stages].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id);
}

export function truncate(s: string | undefined | null, max = 60) {
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** An open deal whose expected close date has passed. */
export function isOverdue(
  expectedCloseDate?: string | null,
  status?: string,
  now: Date = new Date(),
) {
  if (status && status !== "open") return false;
  const d = toDate(expectedCloseDate);
  return !!d && d.getTime() < now.getTime();
}
