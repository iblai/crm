"use client";

import { CalendarCheck2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActivityRow } from "@/components/crm/activity-timeline";
import type { Activity } from "@/lib/crm/types";

/** The next few pieces of open, scheduled work across the organization. */
export function UpNextList({ activities }: { activities: Activity[] }) {
  const t = useTranslations("dashboard");
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <CalendarCheck2 className="size-5 text-gray-300" />
        <p className="text-muted-foreground text-sm">{t("panels.upNext.empty")}</p>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {activities.map((a) => (
        <ActivityRow key={a.id} activity={a} showDealLink showPersonLink />
      ))}
    </ul>
  );
}
