"use client";

import type { ActivityType, DealStatus, LifecycleStage } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

const LIFECYCLE: Record<LifecycleStage, { label: string; className: string }> = {
  lead: { label: "Lead", className: "bg-sky-50 text-sky-700 ring-sky-600/20" },
  qualified: { label: "Qualified", className: "bg-indigo-50 text-indigo-700 ring-indigo-600/20" },
  opportunity: {
    label: "Opportunity",
    className: "bg-violet-50 text-violet-700 ring-violet-600/20",
  },
  customer: { label: "Customer", className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  churned: { label: "Churned", className: "bg-gray-100 text-gray-600 ring-gray-500/20" },
};

export function LifecycleBadge({
  stage,
  className,
}: {
  stage?: LifecycleStage | null;
  className?: string;
}) {
  const meta = LIFECYCLE[stage ?? "lead"] ?? LIFECYCLE.lead;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        meta.className,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}

const DEAL_STATUS: Record<DealStatus, { label: string; className: string; dot: string }> = {
  open: {
    label: "Open",
    className: "bg-[#eef6fc] text-[#0058cc] ring-[#0058cc]/20",
    dot: "bg-[#0058cc]",
  },
  won: {
    label: "Won",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
  },
  lost: {
    label: "Lost",
    className: "bg-rose-50 text-rose-700 ring-rose-600/20",
    dot: "bg-rose-500",
  },
};

export function DealStatusBadge({
  status,
  className,
}: {
  status?: DealStatus | null;
  className?: string;
}) {
  const meta = DEAL_STATUS[status ?? "open"] ?? DEAL_STATUS.open;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        meta.className,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden />
      {meta.label}
    </span>
  );
}

export const ACTIVITY_TONES: Record<ActivityType, { label: string; className: string }> = {
  call: { label: "Call", className: "bg-sky-50 text-sky-600" },
  meeting: { label: "Meeting", className: "bg-violet-50 text-violet-600" },
  email: { label: "Email", className: "bg-amber-50 text-amber-600" },
  note: { label: "Note", className: "bg-gray-100 text-gray-600" },
  task: { label: "Task", className: "bg-[#eef6fc] text-[#0058cc]" },
  lunch: { label: "Lunch", className: "bg-orange-50 text-orange-600" },
  deadline: { label: "Deadline", className: "bg-rose-50 text-rose-600" },
};

export function ActivityTypeBadge({ type, className }: { type: ActivityType; className?: string }) {
  const meta = ACTIVITY_TONES[type] ?? ACTIVITY_TONES.note;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium",
        meta.className,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
