"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  CircleCheckBig,
  CircleX,
  Handshake,
  RotateCcw,
  Trash2,
  User,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DealStatusBadge } from "@/components/crm/badges";
import { EmptyState } from "@/components/crm/empty-state";
import { EntityAvatar } from "@/components/crm/entity-avatar";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { FieldRow, InlineSelect, InlineText } from "@/components/crm/inline-field";
import { OwnerSelect } from "@/components/crm/owner-select";
import { TagPicker } from "@/components/crm/tag-picker";
import { ActivityTimeline } from "@/components/crm/activity-timeline";
import { FavoriteButton } from "@/components/crm/favorite-button";
import { HistoryTab } from "@/components/crm/history-tab";
import { SearchPicker } from "@/components/crm/search-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBreadcrumbs } from "@/components/crm/breadcrumbs";
import { isOverdue } from "@/components/crm/deals/deal-card";
import { StageStepper } from "@/components/crm/deals/stage-stepper";
import { LostDialog } from "@/components/crm/deals/lost-dialog";
import { openStages, useDealLookups } from "@/components/crm/deals/use-lookups";
import { useSession } from "@/hooks/use-session";
import {
  errorMessage,
  errorStatus,
  useAttachDealTagMutation,
  useDeleteDealMutation,
  useDetachDealTagMutation,
  useGetDealQuery,
  useGetOrganizationQuery,
  useGetPersonQuery,
  useMarkDealLostMutation,
  useMarkDealWonMutation,
  useMoveDealStageMutation,
  useUpdateDealMutation,
} from "@/lib/crm/api";
import { formatCurrency, formatDate, formatDateTime, formatRelative } from "@/lib/crm/format";
import type { DealInput, PipelineStage } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "CHF",
  "JPY",
  "INR",
  "BRL",
  "MXN",
  "SGD",
  "ZAR",
];

export default function DealDetailPage() {
  const t = useTranslations("deals");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const dealId = Number(params?.id);
  const router = useRouter();
  const { href } = useSession();

  const {
    data: deal,
    isLoading,
    error,
  } = useGetDealQuery(dealId, { skip: !Number.isFinite(dealId) });
  const lookups = useDealLookups();
  const [updateDeal] = useUpdateDealMutation();
  const [moveStage, { isLoading: moving }] = useMoveDealStageMutation();
  const [markWon, { isLoading: winning }] = useMarkDealWonMutation();
  const [markLost, { isLoading: losing }] = useMarkDealLostMutation();
  const [removeDeal, { isLoading: removing }] = useDeleteDealMutation();
  const [attachTag] = useAttachDealTagMutation();
  const [detachTag] = useDetachDealTagMutation();

  const [pendingStage, setPendingStage] = useState<PipelineStage | null>(null);
  const [lostOpen, setLostOpen] = useState(false);
  const [lostStage, setLostStage] = useState<PipelineStage | null>(null);
  const [confirmWon, setConfirmWon] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useBreadcrumbs(
    useMemo(
      () => [{ label: tn("deals"), href: href("/deals") }, { label: deal?.title ?? t("deal") }],
      [href, deal?.title, t, tn],
    ),
  );

  const pipeline = deal ? lookups.pipelineById.get(deal.pipeline) : undefined;
  const stage = deal ? lookups.stageById.get(deal.stage) : undefined;
  const { data: person } = useGetPersonQuery(deal?.person ?? "", { skip: !deal?.person });
  const { data: organization } = useGetOrganizationQuery(deal?.organization ?? "", {
    skip: !deal?.organization,
  });
  const firstOpenStage = openStages(pipeline)[0];

  const patch = async (body: DealInput) => {
    if (!deal) return;
    try {
      await updateDeal({ id: deal.id, body }).unwrap();
    } catch (err) {
      toast.error(errorMessage(err, tc("errorGeneric")));
    }
  };

  const doMove = async (stageId: number, message: string) => {
    if (!deal) return;
    try {
      await moveStage({ id: deal.id, stage_id: stageId }).unwrap();
      toast.success(message);
    } catch (err) {
      toast.error(errorMessage(err, t("toast.moveFailed")));
    } finally {
      setPendingStage(null);
    }
  };

  if (!Number.isFinite(dealId) || errorStatus(error) === 404) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <EmptyState
          icon={<Handshake />}
          title={t("detail.notFoundTitle")}
          description={t("detail.notFoundDescription")}
          action={
            <Button variant="outline" onClick={() => router.push(href("/deals"))}>
              {t("detail.backToDeals")}
            </Button>
          }
        />
      </div>
    );
  }

  if (isLoading || !deal) {
    return (
      <div className="flex-1 space-y-4 overflow-auto p-4 md:p-6">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <Skeleton className="h-96 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const closed = deal.status !== "open";
  const overdue = isOverdue(deal.expected_close_date, deal.status);

  const onStageSelect = (target: PipelineStage) => {
    if (target.id === deal.stage) return;
    if (target.is_lost) {
      setLostStage(target);
      setLostOpen(true);
      return;
    }
    if (target.is_won || closed) {
      setPendingStage(target);
      return;
    }
    void doMove(target.id, t("toast.moved", { stage: target.name }));
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto w-full max-w-7xl space-y-4 p-4 md:p-6">
        {/* ------------------------------------------------------- header */}
        <section
          className={cn(
            "rounded-xl border bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] md:p-5",
            deal.status === "won" && "border-emerald-200",
            deal.status === "lost" && "border-rose-200",
            deal.status === "open" && "border-[var(--border-color,#e5e7eb)]",
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <EntityAvatar name={deal.title} seed={deal.id} kind="deal" size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-0 text-lg font-semibold text-gray-900">
                    <InlineText
                      value={deal.title}
                      onSave={(v) => patch({ title: v.trim() || deal.title })}
                      placeholder={t("detail.untitled")}
                    />
                  </div>
                  <DealStatusBadge status={deal.status} />
                </div>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-900 tabular-nums">
                  {formatCurrency(deal.lead_value, deal.currency, locale)}
                </p>
                <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <Link
                    href={href(`/people/${deal.person}`)}
                    className="inline-flex items-center gap-1 text-[#0058cc] hover:underline"
                  >
                    <User className="size-3" />
                    {person?.name ?? t("unknownPerson")}
                  </Link>
                  {deal.organization ? (
                    <Link
                      href={href(`/companies/${deal.organization}`)}
                      className="inline-flex items-center gap-1 text-[#0058cc] hover:underline"
                    >
                      <Building2 className="size-3" />
                      {organization?.name ?? t("fields.company")}
                    </Link>
                  ) : null}
                  <span>{pipeline?.name ?? t("fields.pipeline")}</span>
                  {deal.expected_close_date ? (
                    <span className={cn(overdue && "font-medium text-rose-600")}>
                      {t(overdue ? "closeDate.overdue" : "closeDate.closes", {
                        date: formatDate(deal.expected_close_date, locale),
                      })}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <FavoriteButton target={{ deal: deal.id }} />
              {closed ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!firstOpenStage || moving}
                        onClick={() => firstOpenStage && setPendingStage(firstOpenStage)}
                      />
                    }
                  >
                    <RotateCcw data-icon="inline-start" /> {t("actions.reopen")}
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {t("detail.reopenHint", {
                      stage: firstOpenStage?.name ?? t("detail.firstStage"),
                    })}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          size="sm"
                          className="bg-emerald-600 text-white hover:bg-emerald-700"
                          onClick={() => setConfirmWon(true)}
                          disabled={winning}
                        />
                      }
                    >
                      <CircleCheckBig data-icon="inline-start" /> {t("actions.markWon")}
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t("detail.markWonHint")}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-rose-200 text-rose-700 hover:bg-rose-50"
                          onClick={() => {
                            setLostStage(null);
                            setLostOpen(true);
                          }}
                          disabled={losing}
                        />
                      }
                    >
                      <CircleX data-icon="inline-start" /> {t("actions.markLost")}
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t("detail.markLostHint")}</TooltipContent>
                  </Tooltip>
                </>
              )}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("detail.deleteLabel")}
                      className="text-gray-400 hover:text-rose-600"
                      onClick={() => setConfirmDelete(true)}
                    />
                  }
                >
                  <Trash2 />
                </TooltipTrigger>
                <TooltipContent side="bottom">{t("detail.deleteHint")}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="mt-4 border-t border-gray-100 pt-3">
            <StageStepper
              pipeline={pipeline}
              currentStageId={deal.stage}
              status={deal.status}
              onSelect={onStageSelect}
              disabled={moving || winning || losing}
            />
          </div>
        </section>

        {/* --------------------------------------------- fields + timeline */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <aside className="rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <h2 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
              {tc("details")}
            </h2>
            <dl className="divide-y divide-gray-100">
              <FieldRow label={t("fields.person")}>
                <Link
                  href={href(`/people/${deal.person}`)}
                  className="inline-flex min-w-0 items-center gap-1.5 text-[#0058cc] hover:underline"
                >
                  <EntityAvatar name={person?.name ?? "?"} seed={deal.person} size="xs" />
                  <span className="truncate">{person?.name ?? t("unknownPerson")}</span>
                </Link>
              </FieldRow>

              <FieldRow label={t("fields.company")}>
                <div className="space-y-1">
                  <SearchPicker
                    kind="organization"
                    value={deal.organization}
                    onChange={(id) => void patch({ organization: id })}
                    placeholder={t("fields.noCompany")}
                    size="sm"
                    className="h-8 border-transparent bg-transparent shadow-none hover:bg-gray-50"
                  />
                  {deal.organization ? (
                    <Link
                      href={href(`/companies/${deal.organization}`)}
                      className="ml-1.5 text-xs text-[#0058cc] hover:underline"
                    >
                      {t("detail.openCompany")}
                    </Link>
                  ) : null}
                </div>
              </FieldRow>

              <FieldRow label={t("fields.pipeline")}>
                <span className="text-gray-700">{pipeline?.name ?? `#${deal.pipeline}`}</span>
              </FieldRow>

              <FieldRow label={t("fields.stage")} hint={t("detail.stageHint")}>
                <span className="text-gray-700">{stage?.name ?? `#${deal.stage}`}</span>
              </FieldRow>

              <FieldRow label={t("fields.value")}>
                <InlineText
                  value={deal.lead_value ?? ""}
                  type="number"
                  onSave={(v) => patch({ lead_value: v.trim() ? String(Number(v)) : "0" })}
                  placeholder={t("detail.noValue")}
                  render={(v) => formatCurrency(v, deal.currency, locale)}
                />
              </FieldRow>

              <FieldRow label={t("fields.currency")}>
                <InlineSelect
                  value={deal.currency ?? "USD"}
                  options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                  onSave={(v) => patch({ currency: v })}
                />
              </FieldRow>

              <FieldRow label={t("fields.source")} hint={t("detail.sourceHint")}>
                <InlineSelect
                  value={deal.source ? String(deal.source) : ""}
                  options={lookups.sources.map((s) => ({ value: String(s.id), label: s.name }))}
                  onSave={(v) => patch({ source: v ? Number(v) : null })}
                  allowEmpty
                  emptyLabel={t("fields.noSource")}
                  placeholder={t("fields.noSource")}
                />
              </FieldRow>

              <FieldRow label={tc("owner")}>
                <OwnerSelect
                  value={deal.owner}
                  onChange={(o) => void patch({ owner: o })}
                  size="sm"
                  className="border-transparent bg-transparent shadow-none hover:bg-gray-50"
                />
              </FieldRow>

              <FieldRow label={t("fields.expectedClose")} hint={t("detail.expectedCloseHint")}>
                <InlineText
                  value={deal.expected_close_date ?? ""}
                  type="date"
                  onSave={(v) => patch({ expected_close_date: v || null })}
                  placeholder={t("detail.noDate")}
                  render={(v) => (
                    <span className={cn(overdue && "font-medium text-rose-600")}>
                      {formatDate(v, locale)}
                    </span>
                  )}
                />
              </FieldRow>

              {closed ? (
                <FieldRow label={t("fields.closedAt")}>
                  <span className="text-gray-700">{formatDateTime(deal.closed_at, locale)}</span>
                </FieldRow>
              ) : null}

              {deal.status === "lost" ? (
                <FieldRow label={t("fields.lostReason")}>
                  <span className="text-rose-700">{deal.lost_reason || "—"}</span>
                </FieldRow>
              ) : null}

              <FieldRow label={tc("tags")} hint={t("detail.tagsHint")}>
                <TagPicker
                  tags={deal.tags ?? []}
                  onAttach={(tagId) => attachTag({ id: deal.id, tag_id: tagId }).unwrap()}
                  onDetach={(tagId) => detachTag({ id: deal.id, tag_id: tagId }).unwrap()}
                  compact
                />
              </FieldRow>

              <FieldRow label={tc("description")}>
                <InlineText
                  value={deal.description ?? ""}
                  multiline
                  onSave={(v) => patch({ description: v })}
                  placeholder={t("detail.descriptionPlaceholder")}
                />
              </FieldRow>

              <FieldRow label={tc("created")}>
                <span className="text-gray-600" title={formatDateTime(deal.created_at, locale)}>
                  {formatRelative(deal.created_at, locale)}
                </span>
              </FieldRow>

              <FieldRow label={tc("updated")}>
                <span className="text-gray-600" title={formatDateTime(deal.updated_at, locale)}>
                  {formatRelative(deal.updated_at, locale)}
                </span>
              </FieldRow>
            </dl>
          </aside>

          <section className="min-w-0">
            <Tabs defaultValue="timeline">
              <TabsList variant="line">
                <TabsTrigger value="timeline">{t("detail.activity")}</TabsTrigger>
                <TabsTrigger value="history">{tc("history")}</TabsTrigger>
              </TabsList>
              <TabsContent value="timeline" className="pt-4">
                <ActivityTimeline deal={deal.id} />
              </TabsContent>
              <TabsContent value="history" className="pt-4">
                <HistoryTab kind="deal" id={deal.id} />
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </div>

      {/* ------------------------------------------------------- dialogs */}
      <ConfirmDialog
        open={!!pendingStage}
        onOpenChange={(o) => !o && setPendingStage(null)}
        title={
          closed && pendingStage && !pendingStage.is_won && !pendingStage.is_lost
            ? t("confirm.reopenTitle")
            : t("confirm.moveTitle", { stage: pendingStage?.name ?? t("confirm.stage") })
        }
        description={
          closed && pendingStage && !pendingStage.is_won && !pendingStage.is_lost
            ? t("confirm.reopenDescription", { stage: pendingStage.name })
            : t(pendingStage?.is_won ? "confirm.moveWonDescription" : "confirm.moveDescription", {
                title: deal.title,
                stage: pendingStage?.name ?? t("confirm.thisStage"),
              })
        }
        confirmLabel={t("confirm.move")}
        loading={moving}
        onConfirm={() =>
          pendingStage
            ? doMove(
                pendingStage.id,
                closed && !pendingStage.is_won
                  ? t("toast.reopened")
                  : t("toast.moved", { stage: pendingStage.name }),
              )
            : undefined
        }
      />

      <ConfirmDialog
        open={confirmWon}
        onOpenChange={setConfirmWon}
        title={t("confirm.wonTitle")}
        description={t("confirm.wonDescription", {
          title: deal.title,
          value: formatCurrency(deal.lead_value, deal.currency, locale),
        })}
        confirmLabel={t("actions.markWon")}
        loading={winning}
        onConfirm={async () => {
          try {
            await markWon({ id: deal.id }).unwrap();
            setConfirmWon(false);
            toast.success(t("toast.won"));
          } catch (err) {
            toast.error(errorMessage(err, tc("errorGeneric")));
          }
        }}
      />

      <LostDialog
        open={lostOpen}
        onOpenChange={setLostOpen}
        loading={losing}
        onConfirm={async (reason) => {
          try {
            await markLost({
              id: deal.id,
              lost_reason: reason,
              stage_code: lostStage?.code,
            }).unwrap();
            setLostOpen(false);
            setLostStage(null);
            toast.success(t("toast.lost"));
          } catch (err) {
            toast.error(errorMessage(err, tc("errorGeneric")));
          }
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("confirm.deleteTitle")}
        description={t("confirm.deleteDescription", { title: deal.title })}
        confirmLabel={tc("delete")}
        destructive
        loading={removing}
        onConfirm={async () => {
          try {
            await removeDeal(deal.id).unwrap();
            toast.success(t("toast.deleted"));
            router.push(href("/deals"));
          } catch (err) {
            toast.error(errorMessage(err, tc("errorGeneric")));
          }
        }}
      />
    </div>
  );
}
