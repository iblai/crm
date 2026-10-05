"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Handshake, Plus, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PageHeader } from "@/components/crm/page-header";
import { EmptyState } from "@/components/crm/empty-state";
import { LoadError } from "@/components/crm/load-error";
import { PaginationBar } from "@/components/crm/pagination-bar";
import { SimpleSelect } from "@/components/crm/simple-select";
import { ViewBar } from "@/components/crm/view-bar";
import { DealBoard } from "@/components/crm/deals/deal-board";
import { DealsTable } from "@/components/crm/deals/deals-table";
import { DealDialog } from "@/components/crm/deals/deal-dialog";
import { useDealLookups } from "@/components/crm/deals/use-lookups";
import { useDebounced } from "@/hooks/use-debounced";
import { useDealBoardQuery, useListDealsQuery } from "@/lib/crm/api";
import type { SavedView } from "@/lib/crm/types";
import {
  draftFrom,
  emptyDraft,
  filtersToParams,
  sortsToOrdering,
  type ViewDraft,
} from "@/lib/crm/views";

const VIEW_KEY = "crm.deals.view";
const PAGE_SIZE = 50;

/** The unsaved default: a board, as the page has always opened. */
function defaultDraft(): ViewDraft {
  return { ...emptyDraft("deals"), type: "kanban" };
}

export default function DealsPage() {
  const tn = useTranslations("nav");
  return (
    <Suspense fallback={<PageHeader icon={<Handshake />} title={tn("deals")} />}>
      <DealsPageContent />
    </Suspense>
  );
}

function DealsPageContent() {
  const t = useTranslations("deals");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [draft, setDraft] = useState<ViewDraft>(defaultDraft);
  const [pickedPipelineId, setPipelineId] = useState("");
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [seed, setSeed] = useState<{ person?: string; organization?: string }>({});
  const q = useDebounced(search.trim());

  const lookups = useDealLookups();

  // Remember the layout the user last used for the unsaved view.
  useEffect(() => {
    const stored = window.localStorage.getItem(VIEW_KEY);
    if (stored === "kanban" || stored === "table") {
      setDraft((d) => (d.id ? d : { ...d, type: stored }));
    }
  }, []);
  useEffect(() => {
    if (!draft.id) window.localStorage.setItem(VIEW_KEY, draft.type);
  }, [draft.id, draft.type]);

  // `?new=1&person=…&organization=…` opens the create dialog prefilled.
  useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    setSeed({
      person: searchParams.get("person") ?? undefined,
      organization: searchParams.get("organization") ?? undefined,
    });
    setNewOpen(true);
    router.replace(window.location.pathname);
  }, [searchParams, router]);

  // The organization's default pipeline until the user picks another.
  const pipelineId = pickedPipelineId || String(lookups.defaultPipeline?.id ?? "");

  const pipeline = lookups.pipelineById.get(Number(pipelineId));
  const serverFilters = useMemo(() => filtersToParams("deals", draft.filters), [draft.filters]);
  const ordering = sortsToOrdering("deals", draft.sorts);
  const isBoard = draft.type === "kanban";
  // The layout is the unsaved view's remembered preference, not a change to save.
  const unsavedDraft = useMemo(() => ({ ...defaultDraft(), type: draft.type }), [draft.type]);

  // A new query starts on page 1 without an effect: the page lives with its key.
  const pagingKey = JSON.stringify([pipelineId, q, serverFilters, ordering]);
  const [paging, setPaging] = useState({ key: pagingKey, page: 1 });
  const page = paging.key === pagingKey ? paging.page : 1;
  const setPage = (next: number) => setPaging({ key: pagingKey, page: next });

  const {
    data: board,
    isLoading: boardLoading,
    error: boardError,
  } = useDealBoardQuery(
    {
      ...serverFilters,
      pipeline: Number(pipelineId),
      search: [serverFilters.search, q].filter(Boolean).join(" ") || undefined,
      limit: 100,
    },
    { skip: !isBoard || !pipelineId },
  );
  const {
    data: tableDeals,
    isLoading: tableLoading,
    error: tableError,
  } = useListDealsQuery(
    {
      ...serverFilters,
      pipeline: pipelineId ? Number(pipelineId) : undefined,
      search: [serverFilters.search, q].filter(Boolean).join(" ") || undefined,
      ordering,
      page,
      page_size: PAGE_SIZE,
    },
    { skip: isBoard },
  );

  const tableRows = tableDeals?.results ?? [];
  const visibleColumns = useMemo(
    () => draft.columns.filter((c) => c.visible).map((c) => c.id),
    [draft.columns],
  );

  const selectView = (view: SavedView | null) =>
    setDraft(view ? draftFrom(view) : { ...defaultDraft(), type: draft.type });

  const boardCount = board?.stages.reduce((sum, s) => sum + s.count, 0) ?? null;
  const count = isBoard ? boardCount : (tableDeals?.count ?? null);
  const filtersActive = draft.filters.length > 0 || q.length > 0;
  const clearFilters = () => {
    setSearch("");
    setDraft((d) => ({ ...d, filters: [] }));
  };

  // The board waits on both the pipelines and the deals before it can say
  // "no deals" — otherwise the empty state flashes on every load.
  const noPipeline = !lookups.isLoading && !lookups.error && lookups.pipelines.length === 0;
  const boardBusy = boardLoading || lookups.isLoading || (!pipelineId && !noPipeline);
  const loadError = lookups.error ?? (isBoard ? boardError : tableError);
  const isEmpty = isBoard
    ? !boardBusy && boardCount === 0 && !filtersActive
    : !tableLoading && (tableDeals?.count ?? 0) === 0 && !filtersActive;

  return (
    <>
      <PageHeader
        icon={<Handshake />}
        title={tn("deals")}
        count={count}
        description={t("list.description")}
        actions={
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="sm"
                  className="ibl-button-primary"
                  onClick={() => {
                    setSeed({});
                    setNewOpen(true);
                  }}
                />
              }
            >
              <Plus data-icon="inline-start" /> {t("newDeal")}
            </TooltipTrigger>
            <TooltipContent side="bottom">{t("list.newHint")}</TooltipContent>
          </Tooltip>
        }
        toolbar={
          <>
            <SimpleSelect
              value={pipelineId}
              onChange={setPipelineId}
              options={lookups.pipelines.map((p) => ({ value: String(p.id), label: p.name }))}
              placeholder={t("fields.pipeline")}
              size="sm"
              className="w-44"
              aria-label={t("fields.pipeline")}
            />
            <div className="relative w-56">
              <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("list.searchPlaceholder")}
                className="h-8 pl-7 text-sm"
                aria-label={t("list.searchLabel")}
              />
            </div>
            {filtersActive ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X data-icon="inline-start" /> {tc("clear")}
              </Button>
            ) : null}
            <ViewBar
              objectType="deals"
              draft={draft}
              onChange={setDraft}
              onSelectView={selectView}
              stageOptions={(pipeline?.stages ?? []).map((s) => ({
                value: String(s.id),
                label: s.name,
              }))}
              sourceOptions={lookups.sources.map((s) => ({ value: String(s.id), label: s.name }))}
              defaultDraft={unsavedDraft}
              canKanban
              className="basis-full"
            />
          </>
        }
      />

      {loadError ? (
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <LoadError error={loadError} />
        </div>
      ) : noPipeline ? (
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <EmptyState icon={<Handshake />} title={t("board.noPipeline")} />
        </div>
      ) : isEmpty ? (
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <EmptyState
            icon={<Handshake />}
            title={t("list.emptyTitle")}
            description={t("list.emptyDescription")}
            action={
              <Button
                className="ibl-button-primary"
                onClick={() => {
                  setSeed({});
                  setNewOpen(true);
                }}
              >
                <Plus data-icon="inline-start" /> {t("newDeal")}
              </Button>
            }
          />
        </div>
      ) : isBoard ? (
        <div className="min-h-0 flex-1 overflow-hidden">
          <DealBoard board={board} isLoading={boardBusy} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-auto p-4 md:p-6">
            <DealsTable
              deals={tableRows}
              isLoading={tableLoading}
              stageById={lookups.stageById}
              sourceName={lookups.sourceName}
              columns={visibleColumns}
            />
            {!tableLoading && tableRows.length === 0 ? (
              <p className="text-muted-foreground py-10 text-center text-sm">
                {t("list.noMatches")}
              </p>
            ) : null}
          </div>
          <PaginationBar
            data={tableDeals}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            label={t("list.paginationLabel")}
          />
        </div>
      )}

      <DealDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        defaultPerson={seed.person}
        defaultOrganization={seed.organization}
        defaultPipeline={pipelineId ? Number(pipelineId) : undefined}
      />
    </>
  );
}
