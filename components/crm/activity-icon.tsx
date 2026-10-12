"use client";

import {
  CalendarClock,
  Mail,
  MessageSquareText,
  Phone,
  Sandwich,
  SquareCheckBig,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ActivityType } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

export const ACTIVITY_ICONS: Record<ActivityType, LucideIcon> = {
  call: Phone,
  meeting: Users,
  email: Mail,
  note: MessageSquareText,
  task: SquareCheckBig,
  lunch: Sandwich,
  deadline: CalendarClock,
};

/** One grey tile for every type; the icon carries the type. */
export const ACTIVITY_TONE = "bg-gray-100 text-gray-600";

export function ActivityIcon({
  type,
  className,
  size = "md",
}: {
  type: ActivityType;
  className?: string;
  size?: "sm" | "md";
}) {
  const Icon = ACTIVITY_ICONS[type] ?? MessageSquareText;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        size === "sm" ? "size-6 [&_svg]:size-3" : "size-8 [&_svg]:size-4",
        ACTIVITY_TONE,
        className,
      )}
    >
      <Icon strokeWidth={1.75} />
    </span>
  );
}
