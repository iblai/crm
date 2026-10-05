"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Handshake, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/crm/empty-state";
import { DealStatusBadge } from "@/components/crm/badges";
import { useSession } from "@/hooks/use-session";
import { useListDealsQuery, useListPipelinesQuery } from "@/lib/crm/api";
import { formatCurrency, formatDate } from "@/lib/crm/format";

const th =
  "h-9 whitespace-nowrap px-4 text-left text-xs font-medium tracking-wide text-muted-foreground";
const td = "border-b border-gray-100 px-4 py-2 align-middle";

/**
 * The deals attached to a person or an organization, as a compact table on
 * the record's "Deals" tab. Stage names come from the pipelines the org has
 * configured; the link goes to the Deals module.
 */
export function DealsMiniTable({
  person,
  organization,
  emptyDescription,
}: {
  person?: string;
  organization?: string;
  emptyDescription?: string;
}) {
  const t = useTranslations("people");
  const locale = useLocale();
  const router = useRouter();
  const { href } = useSession();
  const { data, isLoading } = useListDealsQuery(
    { person, organization, page_size: 50 },
    { skip: !person && !organization },
  );
  const { data: pipelines } = useListPipelinesQuery({ page_size: 100 });

  const stageNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of pipelines?.results ?? []) {
      for (const s of p.stages ?? []) map.set(s.id, s.name);
    }
    return map;
  }, [pipelines]);

  const newDealHref = person
    ? href(`/deals?new=1&person=${person}`)
    : href(`/deals?new=1&organization=${organization ?? ""}`);

  const deals = data?.results ?? [];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-11 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!deals.length) {
    return (
      <EmptyState
        icon={<Handshake strokeWidth={1.75} />}
        title={t("dealsTable.empty")}
        description={emptyDescription ?? t("dealsTable.emptyHint")}
        action={
          <Button className="ibl-button-primary" size="sm" onClick={() => router.push(newDealHref)}>
            <Plus data-icon="inline-start" strokeWidth={1.75} /> {t("dealsTable.newDeal")}
          </Button>
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-2">
        <span className="text-muted-foreground text-xs font-medium">
          {t("dealsTable.count", { count: data?.count ?? deals.length })}
        </span>
        <Button variant="outline" size="sm" onClick={() => router.push(newDealHref)}>
          <Plus data-icon="inline-start" strokeWidth={1.75} /> {t("dealsTable.newDeal")}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[42rem] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th scope="col" className={`${th} border-b border-gray-100`}>
                {t("dealsTable.deal")}
              </th>
              <th scope="col" className={`${th} border-b border-gray-100`}>
                {t("dealsTable.status")}
              </th>
              <th scope="col" className={`${th} border-b border-gray-100`}>
                {t("dealsTable.value")}
              </th>
              <th scope="col" className={`${th} border-b border-gray-100`}>
                {t("dealsTable.stage")}
              </th>
              <th scope="col" className={`${th} border-b border-gray-100`}>
                {t("dealsTable.expectedClose")}
              </th>
            </tr>
          </thead>
          <tbody>
            {deals.map((d) => (
              <tr
                key={d.id}
                onClick={() => router.push(href(`/deals/${d.id}`))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") router.push(href(`/deals/${d.id}`));
                }}
                tabIndex={0}
                className="cursor-pointer transition-colors outline-none hover:bg-gray-50 focus-visible:bg-gray-50"
              >
                <td className={td}>
                  <Link
                    href={href(`/deals/${d.id}`)}
                    onClick={(e) => e.stopPropagation()}
                    className="font-medium text-gray-900 hover:text-[#0058cc]"
                  >
                    {d.title}
                  </Link>
                </td>
                <td className={td}>
                  <DealStatusBadge status={d.status} />
                </td>
                <td className={`${td} text-gray-700 tabular-nums`}>
                  {formatCurrency(d.lead_value, d.currency, locale)}
                </td>
                <td className={`${td} text-gray-700`}>
                  {stageNames.get(d.stage) ??
                    t("dealsTable.stageFallback", { id: String(d.stage) })}
                </td>
                <td className={`${td} text-muted-foreground`}>
                  {d.expected_close_date ? formatDate(d.expected_close_date, locale) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
