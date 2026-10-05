"use client";

import { useLocale, useTranslations } from "next-intl";
import { History } from "lucide-react";
import { EmptyState } from "@/components/crm/empty-state";
import { LoadError } from "@/components/crm/load-error";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDealHistoryQuery,
  useOrganizationHistoryQuery,
  usePersonHistoryQuery,
} from "@/lib/crm/api";
import { formatDateTime, formatRelative } from "@/lib/crm/format";
import type { HistoryEntry } from "@/lib/crm/types";

type Props =
  | { kind: "person"; id: string }
  | { kind: "organization"; id: string }
  | { kind: "deal"; id: number };

function useHistory(props: Props) {
  const person = usePersonHistoryQuery(props.kind === "person" ? props.id : "", {
    skip: props.kind !== "person",
  });
  const organization = useOrganizationHistoryQuery(props.kind === "organization" ? props.id : "", {
    skip: props.kind !== "organization",
  });
  const deal = useDealHistoryQuery(props.kind === "deal" ? props.id : 0, {
    skip: props.kind !== "deal",
  });
  if (props.kind === "person") return person;
  if (props.kind === "organization") return organization;
  return deal;
}

type FieldNamespace = "persons" | "organizations" | "deals";

function Diff({
  changes,
  ns,
}: {
  changes: NonNullable<HistoryEntry["changes"]>;
  ns: FieldNamespace;
}) {
  const t = useTranslations("history");
  const tf = useTranslations("fields");
  // The DM names columns; show the field label where one exists.
  const label = (field: string) => {
    const key = `${ns}.${field}` as never;
    return tf.has(key) ? tf(key) : field;
  };
  // The DM renders a null as the string "None".
  const show = (value: string) => (value && value !== "None" ? value : t("empty"));
  return (
    <dl className="mt-1 grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-xs">
      {Object.entries(changes).map(([field, [before, after]]) => (
        <div key={field} className="contents">
          <dt className="truncate text-[11px] text-gray-500">{label(field)}</dt>
          <dd className="min-w-0 text-gray-700">
            <span className="text-gray-400 line-through">{show(before)}</span>{" "}
            <span aria-hidden>→</span>{" "}
            <span className="font-medium text-gray-900">{show(after)}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** The record's audit entries, newest first: creation and field changes. */
export function HistoryTab(props: Props) {
  const t = useTranslations("history");
  const locale = useLocale();
  const { data, isLoading, error } = useHistory(props);
  const ns: FieldNamespace =
    props.kind === "person" ? "persons" : props.kind === "organization" ? "organizations" : "deals";

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }
  if (error) return <LoadError error={error} />;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={<History strokeWidth={1.75} />}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    );
  }
  return (
    <ol className="divide-y divide-gray-100 rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white">
      {data.map((entry) => (
        <li key={entry.id} className="px-4 py-3">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
            <span className="font-medium text-gray-900">{entry.actor_username ?? t("system")}</span>
            <span className="text-gray-600">{t(`action.${entry.action}`)}</span>
            <time
              dateTime={entry.timestamp}
              title={formatDateTime(entry.timestamp, locale)}
              className="text-muted-foreground ml-auto text-xs"
            >
              {formatRelative(entry.timestamp, locale)}
            </time>
          </div>
          {entry.action === "update" && entry.changes ? (
            <Diff changes={entry.changes} ns={ns} />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
