"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations, type Messages } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { DealStatusBadge } from "@/components/crm/badges";
import { EntityAvatar } from "@/components/crm/entity-avatar";
import { TagList } from "@/components/crm/tag-chip";
import { OwnerName } from "@/components/crm/owner-select";
import { useSession } from "@/hooks/use-session";
import { isOverdue } from "@/components/crm/deals/deal-card";
import { formatCurrency, formatDate } from "@/lib/crm/format";
import type { Deal, PipelineStage } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

/** View field id → table column key (`fields.*` message). */
type Shared = "owner" | "tags" | "created";
type Column = keyof Messages["deals"]["fields"] | Shared;

const COLUMN_FOR_FIELD: Record<string, Column> = {
  title: "title",
  stage: "stage",
  status: "status",
  lead_value: "value",
  person: "person",
  organization: "company",
  owner: "owner",
  source: "source",
  expected_close_date: "expectedClose",
  tags: "tags",
  created_at: "created",
};
const DEFAULT_COLUMNS = Object.keys(COLUMN_FOR_FIELD);

/** The spreadsheet view of the pipeline — one page of deals at a time. */
export function DealsTable({
  deals,
  isLoading,
  stageById,
  personName,
  organizationName,
  sourceName,
  columns = DEFAULT_COLUMNS,
}: {
  deals: Deal[];
  isLoading?: boolean;
  stageById: Map<number, PipelineStage>;
  personName: (id?: string | null) => string;
  organizationName: (id?: string | null) => string;
  sourceName: (id?: number | null) => string;
  /** Visible view field ids, in order (see `lib/crm/views.ts`). */
  columns?: readonly string[];
}) {
  const t = useTranslations("deals");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const { href } = useSession();
  const HEAD = columns.map((id) => COLUMN_FOR_FIELD[id]).filter(Boolean);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/70 hover:bg-gray-50/70">
            {HEAD.map((h) => (
              <TableHead
                key={h}
                className={cn(
                  "text-[11px] font-semibold tracking-wide text-muted-foreground uppercase",
                  h === "value" && "text-right",
                )}
              >
                {h === "owner" || h === "tags" || h === "created" ? tc(h) : t(`fields.${h}`)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && deals.length === 0
            ? Array.from({ length: 6 }, (_, i) => (
                <TableRow key={`s-${i}`}>
                  {HEAD.map((h) => (
                    <TableCell key={h}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : deals.map((deal) => {
                const stage = stageById.get(deal.stage);
                const overdue = isOverdue(deal.expected_close_date, deal.status);
                const org = organizationName(deal.organization);
                const source = sourceName(deal.source);
                return (
                  <TableRow
                    key={deal.id}
                    onClick={() => router.push(href(`/deals/${deal.id}`))}
                    className="cursor-pointer"
                  >
                    {HEAD.map((h) => (
                      <TableCell
                        key={h}
                        className={cn(
                          h === "title" && "max-w-[16rem] font-medium text-gray-900",
                          h === "value" && "text-right font-medium tabular-nums",
                          (h === "person" || h === "company" || h === "tags") && "max-w-[12rem]",
                          (h === "owner" || h === "source") && "text-gray-700",
                          h === "expectedClose" &&
                            (overdue ? "font-medium text-rose-600" : "text-gray-700"),
                          h === "created" && "text-muted-foreground",
                        )}
                      >
                        {h === "title" ? (
                          <span className="block truncate">{deal.title}</span>
                        ) : h === "stage" ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                              stage?.is_won
                                ? "bg-emerald-50 text-emerald-700"
                                : stage?.is_lost
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-gray-100 text-gray-700",
                            )}
                          >
                            {stage?.name ?? t("fields.stageFallback", { id: deal.stage })}
                          </span>
                        ) : h === "status" ? (
                          <DealStatusBadge status={deal.status} />
                        ) : h === "value" ? (
                          formatCurrency(deal.lead_value, deal.currency, locale)
                        ) : h === "person" ? (
                          <span className="flex min-w-0 items-center gap-1.5">
                            <EntityAvatar
                              name={personName(deal.person)}
                              seed={deal.person}
                              size="xs"
                            />
                            <span className="truncate">{personName(deal.person)}</span>
                          </span>
                        ) : h === "company" ? (
                          org ? (
                            <span className="block truncate text-gray-700">{org}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )
                        ) : h === "owner" ? (
                          <OwnerName ownerId={deal.owner} />
                        ) : h === "source" ? (
                          source || <span className="text-muted-foreground">—</span>
                        ) : h === "expectedClose" ? (
                          deal.expected_close_date ? (
                            formatDate(deal.expected_close_date, locale)
                          ) : (
                            "—"
                          )
                        ) : h === "tags" ? (
                          deal.tags?.length ? (
                            <TagList tags={deal.tags} size="xs" max={2} />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )
                        ) : (
                          formatDate(deal.created_at, locale)
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
        </TableBody>
      </Table>
    </div>
  );
}
