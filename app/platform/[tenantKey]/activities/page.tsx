"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarCheck2, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PageHeader } from "@/components/crm/page-header";
import { EmptyState } from "@/components/crm/empty-state";
import { PaginationBar } from "@/components/crm/pagination-bar";
import { SimpleSelect } from "@/components/crm/simple-select";
import { ActivityRow } from "@/components/crm/activity-timeline";
import { InfoTip } from "@/components/crm/info-tip";
import { ActivityDialog } from "@/components/crm/activities/activity-dialog";
import { useBreadcrumbs } from "@/components/crm/breadcrumbs";
import { useSession } from "@/hooks/use-session";
import { groupActivities, RANGE_OPTIONS, rangeParams, type Range } from "@/lib/crm/activities";
import { useListActivitiesQuery } from "@/lib/crm/api";
import { useCrmEnums } from "@/lib/crm/i18n";
import type { Activity, ActivityListParams, ActivityType } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 100;

type Scope = "mine" | "everyone";
type Status = "open" | "done" | "all";

export default function ActivitiesPage() {
  return (
    <Suspense fallback={<ActivitiesFallback />}>
      <ActivitiesView />
    </Suspense>
  );
}

function ActivitiesFallback() {
  const tn = useTranslations("nav");
  return (
    <>
      <PageHeader icon={<CalendarCheck2 />} title={tn("activities")} />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <ListSkeleton />
      </div>
    </>
  );
}

function ActivitiesView() {
  const t = useTranslations("activities");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const { activityTypeOptions } = useCrmEnums();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userId, href } = useSession();
  useBreadcrumbs([{ label: tn("activities"), href: href("/activities") }]);

  const [scope, setScope] = useState<Scope>("mine");
  const [status, setStatus] = useState<Status>("open");
  const [type, setType] = useState<string>("");
  const [range, setRange] = useState<Range>("all");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | undefined>(undefined);
  const [showDone, setShowDone] = useState(false);

  // `?new=1` (from the command palette / a link) opens the composer once.
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(undefined);
      setDialogOpen(true);
      router.replace(href("/activities"));
    }
  }, [searchParams, router, href]);

  const params = useMemo<ActivityListParams>(() => {
    const ranged = rangeParams(range);
    const isDone = status === "all" ? undefined : status === "done";
    return {
      page,
      page_size: PAGE_SIZE,
      owner: scope === "mine" ? (userId ?? undefined) : undefined,
      type: (type || undefined) as ActivityType | undefined,
      ...ranged,
      // An explicit Open/Done choice wins over the range's implicit filter.
      is_done: isDone ?? ranged.is_done,
    };
  }, [page, scope, status, type, range, userId]);

  const { data, isLoading, isFetching } = useListActivitiesQuery(params);
  const rows = useMemo(() => data?.results ?? [], [data]);
  const groups = useMemo(() => groupActivities(rows), [rows]);
  const hasRows = rows.length > 0;

  const resetPage =
    <T,>(setter: (v: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(1);
    };

  const openEdit = (activity?: Activity) => {
    setEditing(activity);
    setDialogOpen(true);
  };

  return (
    <>
      <PageHeader
        icon={<CalendarCheck2 />}
        title={tn("activities")}
        count={data?.count ?? null}
        description={t("list.description")}
        actions={
          <Tooltip>
            <TooltipTrigger
              render={
                <Button size="sm" className="ibl-button-primary" onClick={() => openEdit()} />
              }
            >
              <Plus data-icon="inline-start" /> {t("newActivity")}
            </TooltipTrigger>
            <TooltipContent side="bottom">{t("list.newHint")}</TooltipContent>
          </Tooltip>
        }
        toolbar={
          <>
            <ToggleGroup
              value={[scope]}
              onValueChange={(v) => {
                const next = (v[0] as Scope) ?? scope;
                setScope(next);
                setPage(1);
              }}
              variant="outline"
              size="sm"
              spacing={0}
              aria-label={t("list.scopeLabel")}
            >
              <Tooltip>
                <TooltipTrigger
                  render={
                    <ToggleGroupItem
                      value="mine"
                      className="data-pressed:bg-[#eef6fc] data-pressed:text-[#0058cc]"
                    />
                  }
                >
                  {t("list.mine")}
                </TooltipTrigger>
                <TooltipContent side="bottom">{t("list.mineHint")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <ToggleGroupItem
                      value="everyone"
                      className="data-pressed:bg-[#eef6fc] data-pressed:text-[#0058cc]"
                    />
                  }
                >
                  {t("list.everyone")}
                </TooltipTrigger>
                <TooltipContent side="bottom">{t("list.everyoneHint")}</TooltipContent>
              </Tooltip>
            </ToggleGroup>

            <ToggleGroup
              value={[status]}
              onValueChange={(v) => {
                const next = (v[0] as Status) ?? status;
                setStatus(next);
                setPage(1);
              }}
              variant="outline"
              size="sm"
              spacing={0}
              aria-label={t("list.statusLabel")}
            >
              <Tooltip>
                <TooltipTrigger
                  render={
                    <ToggleGroupItem
                      value="open"
                      className="data-pressed:bg-[#eef6fc] data-pressed:text-[#0058cc]"
                    />
                  }
                >
                  {tc("open")}
                </TooltipTrigger>
                <TooltipContent side="bottom">{t("list.openHint")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <ToggleGroupItem
                      value="done"
                      className="data-pressed:bg-[#eef6fc] data-pressed:text-[#0058cc]"
                    />
                  }
                >
                  {tc("done")}
                </TooltipTrigger>
                <TooltipContent side="bottom">{t("list.doneHint")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <ToggleGroupItem
                      value="all"
                      className="data-pressed:bg-[#eef6fc] data-pressed:text-[#0058cc]"
                    />
                  }
                >
                  {tc("all")}
                </TooltipTrigger>
                <TooltipContent side="bottom">{t("list.allHint")}</TooltipContent>
              </Tooltip>
            </ToggleGroup>

            <SimpleSelect
              value={type}
              onChange={resetPage(setType)}
              options={activityTypeOptions}
              allowEmpty
              emptyLabel={t("list.allTypes")}
              placeholder={t("list.allTypes")}
              size="sm"
              className="w-36"
              aria-label={t("typeLabel")}
            />

            <SimpleSelect
              value={range}
              onChange={resetPage((v: string) => setRange(v as Range))}
              options={RANGE_OPTIONS.map((value) => ({
                value,
                label: value === "overdue" || value === "today" ? tc(value) : t(`range.${value}`),
              }))}
              size="sm"
              className="w-36"
              aria-label={t("list.rangeLabel")}
            />

            {isFetching && !isLoading ? (
              <span className="text-muted-foreground text-xs">{t("list.refreshing")}</span>
            ) : null}
          </>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-auto">
        <div className="flex-1 p-4 md:p-6">
          {isLoading ? (
            <ListSkeleton />
          ) : !hasRows ? (
            <EmptyState
              icon={<CalendarCheck2 />}
              title={t("list.emptyTitle")}
              description={scope === "mine" ? t("list.emptyMine") : t("list.emptyEveryone")}
              action={
                <Button className="ibl-button-primary" onClick={() => openEdit()}>
                  <Plus data-icon="inline-start" /> {t("newActivity")}
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-6">
              <Section kind="overdue" items={groups.overdue} onEdit={openEdit} />
              <Section kind="today" items={groups.today} onEdit={openEdit} />
              <Section kind="upcoming" items={groups.upcoming} onEdit={openEdit} />
              <Section kind="unscheduled" items={groups.unscheduled} onEdit={openEdit} />
              {groups.done.length ? (
                <section>
                  <button
                    type="button"
                    onClick={() => setShowDone((s) => !s)}
                    className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase hover:text-gray-900"
                    aria-expanded={showDone}
                  >
                    {showDone ? (
                      <ChevronDown className="size-3.5" />
                    ) : (
                      <ChevronRight className="size-3.5" />
                    )}
                    {tc("done")}
                    <span className="rounded-full bg-gray-100 px-1.5 py-px text-[11px] font-medium text-gray-600 normal-case">
                      {groups.done.length}
                    </span>
                  </button>
                  {showDone ? (
                    <ul className="space-y-2">
                      {groups.done.map((a) => (
                        <RowShell key={a.id} activity={a} onEdit={openEdit} />
                      ))}
                    </ul>
                  ) : null}
                </section>
              ) : null}
            </div>
          )}
        </div>
        <PaginationBar
          data={data}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          label={t("list.paginationLabel")}
        />
      </div>

      <ActivityDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(undefined);
        }}
        activity={editing}
      />
    </>
  );
}

const TONES = {
  overdue: "text-rose-600",
  today: "text-[#0058cc]",
  upcoming: "text-muted-foreground",
  unscheduled: "text-muted-foreground",
};

function Section({
  kind,
  items,
  onEdit,
}: {
  kind: keyof typeof TONES;
  items: Activity[];
  onEdit: (activity: Activity) => void;
}) {
  const t = useTranslations("activities");
  const tc = useTranslations("common");
  if (!items.length) return null;
  return (
    <section>
      <h2
        className={cn(
          "mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase",
          TONES[kind],
        )}
      >
        {kind === "upcoming" ? t("sections.upcoming") : tc(kind)}
        <span className="rounded-full bg-gray-100 px-1.5 py-px text-[11px] font-medium text-gray-600 normal-case">
          {items.length}
        </span>
        <InfoTip label={t(`sections.${kind}About`)}>{t(`sections.${kind}Info`)}</InfoTip>
      </h2>
      <ul className="space-y-2">
        {items.map((a) => (
          <RowShell key={a.id} activity={a} onEdit={onEdit} />
        ))}
      </ul>
    </section>
  );
}

/** ActivityRow + a click target that opens the edit dialog. */
function RowShell({
  activity,
  onEdit,
}: {
  activity: Activity;
  onEdit: (activity: Activity) => void;
}) {
  const tc = useTranslations("common");
  return (
    <div className="group/row relative">
      <ActivityRow activity={activity} showDealLink showPersonLink />
      <button
        type="button"
        onClick={() => onEdit(activity)}
        className="absolute top-2 right-20 rounded-md px-2 py-0.5 text-[11px] font-medium text-[#0058cc] opacity-0 transition-opacity group-hover/row:opacity-100 hover:bg-[#eef6fc]"
      >
        {tc("edit")}
      </button>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1].map((s) => (
        <div key={s} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}
