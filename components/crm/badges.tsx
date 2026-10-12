"use client";

import { ACTIVITY_ICONS, ACTIVITY_TONE } from "@/components/crm/activity-icon";
import { useCrmEnums } from "@/lib/crm/i18n";
import type { ActivityType, DealStatus, LifecycleStage } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

// Grey unless it means good: only customers get a colour.
const GREY = "bg-gray-100 text-gray-600 ring-gray-500/20";
const LIFECYCLE: Record<LifecycleStage, string> = {
  lead: GREY,
  qualified: GREY,
  opportunity: GREY,
  customer: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  churned: GREY,
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

export function ActivityTypeBadge({ type, className }: { type: ActivityType; className?: string }) {
  const { activityType } = useCrmEnums();
  const key = ACTIVITY_ICONS[type] ? type : "note";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium",
        ACTIVITY_TONE,
        className,
      )}
    >
      {activityType(key)}
    </span>
  );
}
