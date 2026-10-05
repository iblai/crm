"use client";

import { useCrmEnums } from "@/lib/crm/i18n";
import type { ActivityType, DealStatus, LifecycleStage } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

const LIFECYCLE: Record<LifecycleStage, string> = {
  lead: "bg-sky-50 text-sky-700 ring-sky-600/20",
  qualified: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  opportunity: "bg-violet-50 text-violet-700 ring-violet-600/20",
  customer: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  churned: "bg-gray-100 text-gray-600 ring-gray-500/20",
};

export function LifecycleBadge({
  stage,
  className,
}: {
  stage?: LifecycleStage | null;
  className?: string;
}) {
  const { lifecycle } = useCrmEnums();
  const key = stage && LIFECYCLE[stage] ? stage : "lead";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        LIFECYCLE[key],
        className,
      )}
    >
      {lifecycle(key)}
    </span>
  );
}

const DEAL_STATUS: Record<DealStatus, { className: string; dot: string }> = {
  open: {
    className: "bg-[#eef6fc] text-[#0058cc] ring-[#0058cc]/20",
    dot: "bg-[#0058cc]",
  },
  won: {
    className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
  },
  lost: {
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
  const { dealStatus } = useCrmEnums();
  const key = status && DEAL_STATUS[status] ? status : "open";
  const meta = DEAL_STATUS[key];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        meta.className,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden />
      {dealStatus(key)}
    </span>
  );
}

export const ACTIVITY_TONES: Record<ActivityType, { className: string }> = {
  call: { className: "bg-sky-50 text-sky-600" },
  meeting: { className: "bg-violet-50 text-violet-600" },
  email: { className: "bg-amber-50 text-amber-600" },
  note: { className: "bg-gray-100 text-gray-600" },
  task: { className: "bg-[#eef6fc] text-[#0058cc]" },
  lunch: { className: "bg-orange-50 text-orange-600" },
  deadline: { className: "bg-rose-50 text-rose-600" },
};

export function ActivityTypeBadge({ type, className }: { type: ActivityType; className?: string }) {
  const { activityType } = useCrmEnums();
  const key = ACTIVITY_TONES[type] ? type : "note";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium",
        ACTIVITY_TONES[key].className,
        className,
      )}
    >
      {activityType(key)}
    </span>
  );
}
