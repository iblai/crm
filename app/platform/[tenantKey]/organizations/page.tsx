"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PageHeader } from "@/components/crm/page-header";
import { EmptyState } from "@/components/crm/empty-state";
import { LoadError } from "@/components/crm/load-error";
import { PaginationBar } from "@/components/crm/pagination-bar";
import { ViewBar } from "@/components/crm/view-bar";
import { OrganizationDialog } from "@/components/crm/organizations/organization-dialog";
import { OrganizationsTable } from "@/components/crm/organizations/organizations-table";
import { useDebounced } from "@/hooks/use-debounced";
import { useListOrganizationsQuery } from "@/lib/crm/api";
import type { SavedView } from "@/lib/crm/types";
import {
  draftFrom,
  emptyDraft,
  filtersToParams,
  sortsToOrdering,
  type ViewDraft,
} from "@/lib/crm/views";

const PAGE_SIZE = 50;

/** Organizations — the accounts behind the people and the deals; server search and views. */
export default function OrganizationsPage() {
  const t = useTranslations("organizations");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<ViewDraft>(() => emptyDraft("organizations"));
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") !== "1") return;
    setCreateOpen(true);
    params.delete("new");
    const qs = params.toString();
    router.replace(`${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [router]);

  const q = useDebounced(search.trim());
  const serverFilters = useMemo(
    () => filtersToParams("organizations", draft.filters),
    [draft.filters],
  );
  const ordering = sortsToOrdering("organizations", draft.sorts);

  // A new query starts on page 1 without an effect: the page lives with its key.
  const pagingKey = JSON.stringify([q, serverFilters, ordering]);
  const [paging, setPaging] = useState({ key: pagingKey, page: 1 });
  const page = paging.key === pagingKey ? paging.page : 1;
  const setPage = (next: number) => setPaging({ key: pagingKey, page: next });

  const { data, isLoading, error } = useListOrganizationsQuery({
    ...serverFilters,
    search: [serverFilters.search, q].filter(Boolean).join(" ") || undefined,
    ordering,
    page,
    page_size: PAGE_SIZE,
  });

  const rows = data?.results ?? [];
  const hasFilter = Boolean(q || draft.filters.length);

  const selectView = (view: SavedView | null) =>
    setDraft(view ? draftFrom(view) : emptyDraft("organizations"));
  const clearFilters = () => {
    setSearch("");
    setDraft((d) => ({ ...d, filters: [] }));
  };

  return (
    <>
      <PageHeader
        icon={<Building2 strokeWidth={1.75} />}
        title={tn("organizations")}
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
            {hasFilter ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                {tc("clear")}
              </Button>
            ) : null}
            <ViewBar
              objectType="organizations"
              draft={draft}
              onChange={setDraft}
              onSelectView={selectView}
              className="basis-full"
            />
          </>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col p-4 md:p-6">
        {error ? (
          <LoadError error={error} />
        ) : !isLoading && rows.length === 0 ? (
          hasFilter ? (
            <EmptyState
              icon={<Building2 strokeWidth={1.75} />}
              title={t("list.noMatchFilters")}
              description={t("list.noMatchFiltersHint")}
              action={
                <Button variant="outline" onClick={clearFilters}>
                  {tc("clearFilters")}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<Building2 strokeWidth={1.75} />}
              title={t("list.emptyTitle")}
              description={t("list.emptyHint")}
              action={
                <Button className="ibl-button-primary" onClick={() => setCreateOpen(true)}>
                  <Plus data-icon="inline-start" strokeWidth={1.75} /> {t("list.addFirst")}
                </Button>
              }
            />
          )
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="min-h-0 flex-1 overflow-auto">
              <OrganizationsTable organizations={rows} isLoading={isLoading} skeletonRows={10} />
            </div>
            <PaginationBar
              data={data}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              label={t("list.paginationLabel")}
            />
          </div>
        )}
      </div>

      <OrganizationDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
