"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PageHeader } from "@/components/crm/page-header";
import { EmptyState } from "@/components/crm/empty-state";
import { PaginationBar } from "@/components/crm/pagination-bar";
import { ViewBar } from "@/components/crm/view-bar";
import { PeopleTable, type PersonColumn } from "@/components/crm/people/people-table";
import { PersonDialog } from "@/components/crm/people/person-dialog";
import { useDebounced } from "@/hooks/use-debounced";
import { useListOrganizationsQuery, useListPersonsQuery } from "@/lib/crm/api";
import type { SavedView } from "@/lib/crm/types";
import {
  applyClientFilters,
  draftFrom,
  emptyDraft,
  filtersToParams,
  sortsToOrdering,
  type ViewDraft,
} from "@/lib/crm/views";

const PAGE_SIZE = 50;

/** View field id → people-table column. */
const PERSON_COLUMN: Record<string, PersonColumn> = {
  job_title: "job_title",
  organization: "organization",
  owner: "owner",
  tags: "tags",
  created_at: "created",
};

/**
 * People — every contact in the organization: server search and views. Merged
 * and linked duplicates (`active=false`) stay hidden unless a view filters on Active.
 */
export default function PeoplePage() {
  const t = useTranslations("people");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<ViewDraft>(() => emptyDraft("persons"));
  const [createOpen, setCreateOpen] = useState(false);
  const q = useDebounced(search.trim());

  // `?new=1` (sidebar / command palette / deep link) opens the create dialog.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") !== "1") return;
    setCreateOpen(true);
    params.delete("new");
    const qs = params.toString();
    router.replace(`${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [router]);

  const serverFilters = useMemo(() => filtersToParams("persons", draft.filters), [draft.filters]);
  const ordering = sortsToOrdering("persons", draft.sorts);

  useEffect(() => {
    setPage(1);
  }, [q, serverFilters, ordering]);

  const { data, isLoading, isFetching } = useListPersonsQuery({
    active: true,
    ...serverFilters,
    search: q || undefined,
    ordering,
    page,
    page_size: PAGE_SIZE,
  });

  const { data: orgs } = useListOrganizationsQuery({ page_size: 100 });
  const orgNames = useMemo(
    () => new Map((orgs?.results ?? []).map((o) => [o.id, o.name] as const)),
    [orgs],
  );

  const rows = useMemo(
    () => applyClientFilters(data?.results ?? [], "persons", draft.filters),
    [data, draft.filters],
  );
  const columns = draft.columns
    .filter((c) => c.visible && PERSON_COLUMN[c.id])
    .map((c) => PERSON_COLUMN[c.id]);

  const selectView = (view: SavedView | null) =>
    setDraft(view ? draftFrom(view) : emptyDraft("persons"));
  const clearFilters = () => {
    setSearch("");
    setDraft((d) => ({ ...d, filters: [] }));
  };

  const filtered = draft.filters.length > 0;
  const empty = !isLoading && rows.length === 0;

  return (
    <>
      <PageHeader
        icon={<Users strokeWidth={1.75} />}
        title={tn("people")}
        count={data?.count ?? null}
        description={t("list.description")}
        actions={
          <Tooltip>
            <TooltipTrigger
              render={<Button className="ibl-button-primary" onClick={() => setCreateOpen(true)} />}
            >
              <Plus data-icon="inline-start" strokeWidth={1.75} /> {t("actions.new")}
            </TooltipTrigger>
            <TooltipContent side="bottom">{t("actions.newHint")}</TooltipContent>
          </Tooltip>
        }
        toolbar={
          <>
            <div className="relative min-w-52 flex-1 sm:max-w-xs">
              <Search
                strokeWidth={1.75}
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-gray-400"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("list.searchPlaceholder")}
                className="h-8 pl-8 text-sm"
                aria-label={t("list.searchLabel")}
              />
            </div>
            {q || filtered ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                {tc("clear")}
              </Button>
            ) : null}
            <ViewBar
              objectType="persons"
              draft={draft}
              onChange={setDraft}
              onSelectView={selectView}
              className="basis-full"
            />
          </>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col p-4 md:p-6">
        {empty && q ? (
          <EmptyState
            icon={<Search strokeWidth={1.75} />}
            title={t("list.noMatchSearch", { query: q })}
            description={t("list.noMatchSearchHint")}
            action={
              <Button variant="outline" onClick={() => setSearch("")}>
                {tc("clearSearch")}
              </Button>
            }
          />
        ) : empty && filtered ? (
          <EmptyState
            icon={<Users strokeWidth={1.75} />}
            title={t("list.noMatchFilters")}
            description={t("list.noMatchFiltersHint")}
            action={
              <Button variant="outline" onClick={clearFilters}>
                {tc("clearFilters")}
              </Button>
            }
          />
        ) : empty ? (
          <EmptyState
            icon={<Users strokeWidth={1.75} />}
            title={t("list.emptyTitle")}
            description={t("list.emptyHint")}
            action={
              <Button className="ibl-button-primary" onClick={() => setCreateOpen(true)}>
                <Plus data-icon="inline-start" strokeWidth={1.75} /> {t("list.addFirst")}
              </Button>
            }
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="min-h-0 flex-1 overflow-auto">
              <PeopleTable
                persons={rows}
                isLoading={isLoading}
                columns={columns}
                orgNames={orgNames}
                skeletonRows={10}
              />
            </div>
            <PaginationBar
              data={data}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              label={t("list.paginationLabel")}
            />
            {isFetching && !isLoading ? (
              <output className="sr-only">{t("list.loading")}</output>
            ) : null}
          </div>
        )}
      </div>

      <PersonDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
