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
      () => [{ label: "Deals", href: href("/deals") }, { label: deal?.title ?? "Deal" }],
      [href, deal?.title],
    ),
  );

  const pipeline = deal ? lookups.pipelineById.get(deal.pipeline) : undefined;
  const stage = deal ? lookups.stageById.get(deal.stage) : undefined;
  const person = deal ? lookups.personById.get(deal.person) : undefined;
  const organization = deal?.organization
    ? lookups.organizationById.get(deal.organization)
    : undefined;
  const firstOpenStage = openStages(pipeline)[0];

  const patch = async (body: DealInput) => {
    if (!deal) return;
    try {
      await updateDeal({ id: deal.id, body }).unwrap();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const doMove = async (stageId: number, message: string) => {
    if (!deal) return;
    try {
      await moveStage({ id: deal.id, stage_id: stageId }).unwrap();
      toast.success(message);
    } catch (err) {
      toast.error(errorMessage(err, "Could not move the deal"));
    } finally {
      setPendingStage(null);
    }
  };

  if (!Number.isFinite(dealId) || errorStatus(error) === 404) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <EmptyState
          icon={<Handshake />}
          title="Deal not found"
          description="This deal may have been deleted, or it belongs to another organization."
          action={
            <Button variant="outline" onClick={() => router.push(href("/deals"))}>
              Back to deals
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
    void doMove(target.id, `Moved to ${target.name}`);
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
                      placeholder="Untitled deal"
                    />
                  </div>
                  <DealStatusBadge status={deal.status} />
                </div>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-900 tabular-nums">
                  {formatCurrency(deal.lead_value, deal.currency)}
                </p>
                <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <Link
                    href={href(`/people/${deal.person}`)}
                    className="inline-flex items-center gap-1 text-[#0058cc] hover:underline"
                  >
                    <User className="size-3" />
                    {person?.name ?? "Unknown person"}
                  </Link>
                  {deal.organization ? (
                    <Link
                      href={href(`/organizations/${deal.organization}`)}
                      className="inline-flex items-center gap-1 text-[#0058cc] hover:underline"
                    >
                      <Building2 className="size-3" />
                      {organization?.name ?? "Organization"}
                    </Link>
                  ) : null}
                  <span>{pipeline?.name ?? "Pipeline"}</span>
                  {deal.expected_close_date ? (
                    <span className={cn(overdue && "font-medium text-rose-600")}>
                      {overdue ? "Overdue · " : "Closes "}
                      {formatDate(deal.expected_close_date)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
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
                    <RotateCcw data-icon="inline-start" /> Reopen
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Put the deal back in {firstOpenStage?.name ?? "the first stage"} and clear its
                    close date
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
                      <CircleCheckBig data-icon="inline-start" /> Mark won
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Close the deal as won at its current value
                    </TooltipContent>
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
                      <CircleX data-icon="inline-start" /> Mark lost
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Close the deal as lost — you are asked for a reason
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete deal"
                      className="text-gray-400 hover:text-rose-600"
                      onClick={() => setConfirmDelete(true)}
                    />
                  }
                >
                  <Trash2 />
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Delete this deal and its activity — this cannot be undone
                </TooltipContent>
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
              Details
            </h2>
            <dl className="divide-y divide-gray-100">
              <FieldRow label="Person">
                <Link
                  href={href(`/people/${deal.person}`)}
                  className="inline-flex min-w-0 items-center gap-1.5 text-[#0058cc] hover:underline"
                >
                  <EntityAvatar name={person?.name ?? "?"} seed={deal.person} size="xs" />
                  <span className="truncate">{person?.name ?? "Unknown person"}</span>
                </Link>
              </FieldRow>

              <FieldRow label="Organization">
                <div className="space-y-1">
                  <InlineSelect
                    value={deal.organization ?? ""}
                    options={lookups.organizations.map((o) => ({ value: o.id, label: o.name }))}
                    onSave={(v) => patch({ organization: v || null })}
                    allowEmpty
                    emptyLabel="No organization"
                    placeholder="No organization"
                  />
                  {deal.organization ? (
                    <Link
                      href={href(`/organizations/${deal.organization}`)}
                      className="ml-1.5 text-xs text-[#0058cc] hover:underline"
                    >
                      Open organization
                    </Link>
                  ) : null}
                </div>
              </FieldRow>

              <FieldRow label="Pipeline">
                <span className="text-gray-700">{pipeline?.name ?? `#${deal.pipeline}`}</span>
              </FieldRow>

              <FieldRow label="Stage" hint="Move the deal with the stage pills above.">
                <span className="text-gray-700">{stage?.name ?? `#${deal.stage}`}</span>
              </FieldRow>

              <FieldRow label="Value">
                <InlineText
                  value={deal.lead_value ?? ""}
                  type="number"
                  onSave={(v) => patch({ lead_value: v.trim() ? String(Number(v)) : "0" })}
                  placeholder="No value"
                  render={(v) => formatCurrency(v, deal.currency)}
                />
              </FieldRow>

              <FieldRow label="Currency">
                <InlineSelect
                  value={deal.currency ?? "USD"}
                  options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                  onSave={(v) => patch({ currency: v })}
                />
              </FieldRow>

              <FieldRow label="Source" hint="Where this deal came from; managed in Settings.">
                <InlineSelect
                  value={deal.source ? String(deal.source) : ""}
                  options={lookups.sources.map((s) => ({ value: String(s.id), label: s.name }))}
                  onSave={(v) => patch({ source: v ? Number(v) : null })}
                  allowEmpty
                  emptyLabel="No source"
                  placeholder="No source"
                />
              </FieldRow>

              <FieldRow label="Owner">
                <OwnerSelect
                  value={deal.owner}
                  onChange={(o) => void patch({ owner: o })}
                  size="sm"
                  className="border-transparent bg-transparent shadow-none hover:bg-gray-50"
                />
              </FieldRow>

              <FieldRow
                label="Expected close"
                hint="Turns red once the date passes while the deal is open."
              >
                <InlineText
                  value={deal.expected_close_date ?? ""}
                  type="date"
                  onSave={(v) => patch({ expected_close_date: v || null })}
                  placeholder="No date"
                  render={(v) => (
                    <span className={cn(overdue && "font-medium text-rose-600")}>
                      {formatDate(v)}
                    </span>
                  )}
                />
              </FieldRow>

              {closed ? (
                <FieldRow label="Closed at">
                  <span className="text-gray-700">{formatDateTime(deal.closed_at)}</span>
                </FieldRow>
              ) : null}

              {deal.status === "lost" ? (
                <FieldRow label="Lost reason">
                  <span className="text-rose-700">{deal.lost_reason || "—"}</span>
                </FieldRow>
              ) : null}

              <FieldRow label="Tags" hint="Shared labels; manage them under Tags.">
                <TagPicker
                  tags={deal.tags ?? []}
                  onAttach={(tagId) => attachTag({ id: deal.id, tag_id: tagId }).unwrap()}
                  onDetach={(tagId) => detachTag({ id: deal.id, tag_id: tagId }).unwrap()}
                  compact
                />
              </FieldRow>

              <FieldRow label="Description">
                <InlineText
                  value={deal.description ?? ""}
                  multiline
                  onSave={(v) => patch({ description: v })}
                  placeholder="Add a description"
                />
              </FieldRow>

              <FieldRow label="Created">
                <span className="text-gray-600" title={formatDateTime(deal.created_at)}>
                  {formatRelative(deal.created_at)}
                </span>
              </FieldRow>

              <FieldRow label="Updated">
                <span className="text-gray-600" title={formatDateTime(deal.updated_at)}>
                  {formatRelative(deal.updated_at)}
                </span>
              </FieldRow>
            </dl>
          </aside>

          <section className="min-w-0">
            <h2 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
              Activity
            </h2>
            <ActivityTimeline deal={deal.id} />
          </section>
        </div>
      </div>

      {/* ------------------------------------------------------- dialogs */}
      <ConfirmDialog
        open={!!pendingStage}
        onOpenChange={(o) => !o && setPendingStage(null)}
        title={
          closed && pendingStage && !pendingStage.is_won && !pendingStage.is_lost
            ? "Reopen this deal?"
            : `Move to ${pendingStage?.name ?? "stage"}?`
        }
        description={
          closed && pendingStage && !pendingStage.is_won && !pendingStage.is_lost
            ? `The deal reopens in “${pendingStage.name}” and its close date is cleared.`
            : `“${deal.title}” moves to ${pendingStage?.name ?? "this stage"}${
                pendingStage?.is_won ? " and closes as won" : ""
              }.`
        }
        confirmLabel="Move"
        loading={moving}
        onConfirm={() =>
          pendingStage
            ? doMove(
                pendingStage.id,
                closed && !pendingStage.is_won ? "Deal reopened" : `Moved to ${pendingStage.name}`,
              )
            : undefined
        }
      />

      <ConfirmDialog
        open={confirmWon}
        onOpenChange={setConfirmWon}
        title="Mark this deal won?"
        description={`“${deal.title}” closes as won at ${formatCurrency(deal.lead_value, deal.currency)}.`}
        confirmLabel="Mark won"
        loading={winning}
        onConfirm={async () => {
          try {
            await markWon({ id: deal.id }).unwrap();
            setConfirmWon(false);
            toast.success("Deal won 🎉");
          } catch (err) {
            toast.error(errorMessage(err));
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
            toast.success("Deal marked lost");
          } catch (err) {
            toast.error(errorMessage(err));
          }
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this deal?"
        description={`“${deal.title}” and its activity will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        loading={removing}
        onConfirm={async () => {
          try {
            await removeDeal(deal.id).unwrap();
            toast.success("Deal deleted");
            router.push(href("/deals"));
          } catch (err) {
            toast.error(errorMessage(err));
          }
        }}
      />
    </div>
  );
}
