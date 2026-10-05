"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/crm/empty-state";
import { errorMessage, errorStatus } from "@/lib/crm/api";

/** A list or panel that failed to load, with the DM's reason — never an empty state. */
export function LoadError({ error, className }: { error: unknown; className?: string }) {
  const tc = useTranslations("common");
  const detail =
    errorStatus(error) === 403 ? tc("errorForbidden") : errorMessage(error, tc("errorGeneric"));
  return (
    <EmptyState
      icon={<AlertTriangle strokeWidth={1.75} />}
      title={tc("errorLoadTitle")}
      description={detail}
      className={className}
    />
  );
}
