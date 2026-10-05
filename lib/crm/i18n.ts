"use client";

import { useTranslations } from "next-intl";
import type { ActivityType, DealStatus, LifecycleStage } from "./types";
import { ACTIVITY_TYPES, DEAL_STATUSES, LIFECYCLE_STAGES } from "./types";

/** Translated labels and select options for the CRM enums. */
export function useCrmEnums() {
  const t = useTranslations("enums");
  return {
    lifecycle: (value: LifecycleStage | string) => t(`lifecycle.${value as LifecycleStage}`),
    activityType: (value: ActivityType | string) => t(`activityType.${value as ActivityType}`),
    dealStatus: (value: DealStatus | string) => t(`dealStatus.${value as DealStatus}`),
    lifecycleOptions: LIFECYCLE_STAGES.map((value) => ({ value, label: t(`lifecycle.${value}`) })),
    activityTypeOptions: ACTIVITY_TYPES.map((value) => ({
      value,
      label: t(`activityType.${value}`),
    })),
    dealStatusOptions: DEAL_STATUSES.map((value) => ({ value, label: t(`dealStatus.${value}`) })),
  };
}
