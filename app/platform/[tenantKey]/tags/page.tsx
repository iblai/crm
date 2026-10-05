"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Tag as TagIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PageHeader } from "@/components/crm/page-header";
import { EmptyState } from "@/components/crm/empty-state";
import { LoadError } from "@/components/crm/load-error";
import { PaginationBar } from "@/components/crm/pagination-bar";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { InlineText } from "@/components/crm/inline-field";
import { TagChip } from "@/components/crm/tag-chip";
import { TagColorPicker, nextTagColor } from "@/components/crm/tags/tag-color-picker";
import { TagDialog } from "@/components/crm/tags/tag-dialog";
import { useBreadcrumbs } from "@/components/crm/breadcrumbs";
import { useDebounced } from "@/hooks/use-debounced";
import { useSession } from "@/hooks/use-session";
import {
  errorMessage,
  errorStatus,
  useDeleteTagMutation,
  useListTagsQuery,
  useUpdateTagMutation,
} from "@/lib/crm/api";
import { formatDate } from "@/lib/crm/format";
import type { Tag } from "@/lib/crm/types";

const PAGE_SIZE = 100;

export default function TagsPage() {
  const t = useTranslations("tags");
  const tn = useTranslations("nav");
  const { href } = useSession();
  useBreadcrumbs([{ label: tn("tags"), href: href("/tags") }]);

  const [search, setSearch] = useState("");
  const query = useDebounced(search.trim(), 250);
  const [paging, setPaging] = useState({ key: query, page: 1 });
  const page = paging.key === query ? paging.page : 1;
  const setPage = (next: number) => setPaging({ key: query, page: next });
  const [creating, setCreating] = useState(false);

  const { data, isLoading, error } = useListTagsQuery({
    page,
    page_size: PAGE_SIZE,
    search: query || undefined,
  });

  const tags = useMemo(() => data?.results ?? [], [data]);

  return (
    <>
      <PageHeader
        icon={<TagIcon />}
        title={tn("tags")}
        count={data?.count ?? null}
        description={t("description")}
        actions={
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="sm"
                  className="ibl-button-primary"
                  onClick={() => setCreating(true)}
                />
              }
            >
              <Plus data-icon="inline-start" /> {t("newTag")}
            </TooltipTrigger>
            <TooltipContent side="bottom">{t("newTagHint")}</TooltipContent>
          </Tooltip>
        }
        toolbar={
          <div className="relative w-full max-w-xs">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-8 pl-8 text-sm"
              aria-label={t("searchLabel")}
            />
          </div>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-auto">
        <div className="flex-1 p-4 md:p-6">
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <LoadError error={error} />
          ) : tags.length === 0 ? (
            <EmptyState
              icon={<TagIcon />}
              title={query ? t("empty.noMatchTitle") : t("empty.title")}
              description={query ? t("empty.noMatchDescription") : t("empty.description")}
              action={
                <Button className="ibl-button-primary" onClick={() => setCreating(true)}>
                  <Plus data-icon="inline-start" /> {t("newTag")}
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {tags.map((tag) => (
                <TagCard key={tag.id} tag={tag} />
              ))}
            </div>
          )}
        </div>
        <PaginationBar
          data={data}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          label={t("paginationLabel")}
        />
      </div>

      <TagDialog
        open={creating}
        onOpenChange={setCreating}
        defaultColor={nextTagColor(data?.count ?? 0)}
      />
    </>
  );
}

function TagCard({ tag }: { tag: Tag }) {
  const t = useTranslations("tags");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [update] = useUpdateTagMutation();
  const [remove, { isLoading: removing }] = useDeleteTagMutation();
  const [confirm, setConfirm] = useState(false);
  const color = tag.color || "#888888";

  const saveError = (err: unknown) =>
    toast.error(
      errorStatus(err) === 403 ? tc("errorForbidden") : errorMessage(err, tc("errorGeneric")),
    );

  const patch = async (body: { name?: string; color?: string }) => {
    try {
      await update({ id: tag.id, body }).unwrap();
    } catch (err) {
      saveError(err);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow hover:shadow-[0_2px_8px_rgba(16,24,40,0.06)]">
      <div className="flex items-start gap-2.5">
        <TagColorPicker
          color={color}
          onChange={(c) => void patch({ color: c })}
          label={t("card.changeColor", { name: tag.name })}
        />
        <div className="min-w-0 flex-1">
          <InlineText
            value={tag.name}
            onSave={(v) => (v.trim() ? patch({ name: v.trim() }) : undefined)}
            placeholder={t("card.untitled")}
            className="text-sm font-medium text-gray-900"
          />
          <p className="text-muted-foreground mt-0.5 px-1.5 text-[11px]">
            {t("card.created", { date: formatDate(tag.created_at, locale) })}
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-gray-400 hover:text-rose-600"
                onClick={() => setConfirm(true)}
                aria-label={t("card.deleteLabel", { name: tag.name })}
              />
            }
          >
            <Trash2 />
          </TooltipTrigger>
          <TooltipContent>{t("card.deleteHint")}</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-2.5">
        <TagChip tag={{ id: tag.id, name: tag.name, color }} />
        <span className="text-muted-foreground font-mono text-[11px] uppercase">{color}</span>
      </div>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t("card.deleteTitle", { name: tag.name })}
        description={t("card.deleteDescription")}
        confirmLabel={t("card.deleteConfirm")}
        destructive
        loading={removing}
        onConfirm={async () => {
          try {
            await remove(tag.id).unwrap();
            setConfirm(false);
            toast.success(t("card.deleted"));
          } catch (err) {
            saveError(err);
          }
        }}
      />
    </div>
  );
}
