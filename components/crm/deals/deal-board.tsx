"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoTip } from "@/components/crm/info-tip";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { DealCard, DraggableDealCard } from "@/components/crm/deals/deal-card";
import { LostDialog } from "@/components/crm/deals/lost-dialog";
import { errorMessage, useMarkDealLostMutation, useMoveDealStageMutation } from "@/lib/crm/api";
import { stageTransition } from "@/lib/crm/deals";
import { formatCompactCurrency } from "@/lib/crm/format";
import config from "@/lib/iblai/config";
import type { Deal, DealBoard as DealBoardData, DealBoardStage } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

/**
 * The pipeline board from `/deals/board/`: one column per stage with the
 * server's count and totals, cards dragged between them with @dnd-kit. A move
 * is applied locally first and reverted with a toast if the API refuses it;
 * the card's "Move to…" menu does the same without dragging. A lost stage asks
 * for the reason, a won stage or a reopen for a confirmation, before anything moves.
 */
export function DealBoard({
  board,
  isLoading,
  className,
}: {
  board?: DealBoardData;
  isLoading?: boolean;
  className?: string;
}) {
  const t = useTranslations("deals");
  const stages = useMemo(() => (board?.stages ?? []).map((s) => s.stage), [board]);
  const deals = useMemo(() => (board?.stages ?? []).flatMap((s) => s.deals), [board]);
  const [moveStage, { isLoading: moving }] = useMoveDealStageMutation();
  const [markLost, { isLoading: losing }] = useMarkDealLostMutation();
  const [activeId, setActiveId] = useState<number | null>(null);
  /** dealId → optimistic stage id, held until the server agrees. */
  const [pending, setPending] = useState<Record<number, number>>({});
  /** The move waiting on its dialog; kept while the dialog closes, so its words don't change. */
  const [asked, setAsked] = useState<{ deal: Deal; stage: Stage; reopen: boolean }>();
  const [dialog, setDialog] = useState<"lost" | "confirm" | null>(null);
  const dealsRef = useRef(deals);
  dealsRef.current = deals;

  // Drop the optimistic override as soon as the refetched deal matches it.
  useEffect(() => {
    setPending((prev) => {
      const entries = Object.entries(prev);
      if (entries.length === 0) return prev;
      let changed = false;
      const next: Record<number, number> = {};
      for (const [id, stageId] of entries) {
        const deal = deals.find((d) => d.id === Number(id));
        if (!deal || deal.stage === stageId) changed = true;
        else next[Number(id)] = stageId;
      }
      return changed ? next : prev;
    });
  }, [deals]);

  // A swipe on a card must scroll; a held finger drags.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  const stageOf = (deal: Deal) => pending[deal.id] ?? deal.stage;

  const columns = useMemo(() => {
    const byStage = new Map<number, Deal[]>(stages.map((s) => [s.id, [] as Deal[]]));
    for (const deal of deals) {
      const bucket = byStage.get(pending[deal.id] ?? deal.stage);
      if (bucket) bucket.push(deal);
    }
    return (board?.stages ?? []).map((column) => ({
      column,
      deals: byStage.get(column.stage.id) ?? [],
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, stages, deals, pending]);

  const activeDeal = activeId ? deals.find((d) => d.id === activeId) : undefined;

  /** Shows the deal in `stageId` while `request` runs; false (and back) when the API refuses. */
  const apply = async (deal: Deal, stageId: number, request: () => Promise<unknown>) => {
    setPending((p) => ({ ...p, [deal.id]: stageId }));
    try {
      await request();
      return true;
    } catch (err) {
      setPending((p) => {
        const next = { ...p };
        delete next[deal.id];
        return next;
      });
      toast.error(errorMessage(err, t("toast.moveFailed")));
      return false;
    }
  };

  const move = (deal: Deal, stageId: number) => {
    const stage = stages.find((s) => s.id === stageId);
    if (!stage) return;
    const kind = stageTransition({ stage: stageOf(deal), status: deal.status }, stage);
    if (kind === "none") return;
    if (kind === "move") {
      void apply(deal, stageId, () => moveStage({ id: deal.id, stage_id: stageId }).unwrap());
      return;
    }
    setAsked({ deal, stage, reopen: kind === "reopen" });
    setDialog(kind === "lost" ? "lost" : "confirm");
  };

  const confirmAsked = async () => {
    if (!asked) return;
    const { deal, stage } = asked;
    const moved = await apply(deal, stage.id, () =>
      moveStage({ id: deal.id, stage_id: stage.id }).unwrap(),
    );
    if (moved) setDialog(null);
  };

  const loseAsked = async (reason: string) => {
    if (!asked) return;
    const { deal, stage } = asked;
    const lost = await apply(deal, stage.id, () =>
      markLost({ id: deal.id, lost_reason: reason, stage_code: stage.code }).unwrap(),
    );
    if (lost) setDialog(null);
  };

  const onDragStart = (e: DragStartEvent) =>
    setActiveId(
      Number((e.active.data.current as { dealId?: number } | undefined)?.dealId ?? 0) || null,
    );

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const dealId = (e.active.data.current as { dealId?: number } | undefined)?.dealId;
    const stageId = (e.over?.data.current as { stageId?: number } | undefined)?.stageId;
    if (!dealId || !stageId) return;
    const deal = dealsRef.current.find((d) => d.id === dealId);
    if (deal) move(deal, stageId);
  };

  if (isLoading && !board) {
    return (
      <div className={cn("flex h-full gap-3 overflow-hidden p-4", className)}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex w-72 shrink-0 flex-col gap-2">
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (!board || stages.length === 0) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-sm">
        {t("board.noStages")}
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={onDragEnd}
      >
        <div
          className={cn(
            "flex h-full min-h-0 items-stretch gap-3 overflow-x-auto overflow-y-hidden p-4",
            className,
          )}
        >
          {columns.map(({ column, deals: rows }) => (
            <BoardColumn
              key={column.stage.id}
              column={column}
              deals={rows}
              stages={stages}
              rottenDays={board.pipeline.rotten_days}
              onMove={move}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeDeal ? (
            <DealCard
              deal={activeDeal}
              personName={activeDeal.person_name}
              organizationName={activeDeal.organization_name ?? undefined}
              stale={activeDeal.is_stale}
              rottenDays={board.pipeline.rotten_days}
              overlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <LostDialog
        open={dialog === "lost"}
        onOpenChange={(open) => setDialog(open ? "lost" : null)}
        loading={losing}
        onConfirm={loseAsked}
      />
      <ConfirmDialog
        open={dialog === "confirm"}
        onOpenChange={(open) => setDialog(open ? "confirm" : null)}
        title={
          asked?.reopen
            ? t("confirm.reopenTitle")
            : t("confirm.moveTitle", { stage: asked?.stage.name ?? t("confirm.stage") })
        }
        description={
          asked?.reopen
            ? t("confirm.reopenDescription", { stage: asked.stage.name })
            : t("confirm.moveWonDescription", {
                title: asked?.deal.title ?? "",
                stage: asked?.stage.name ?? t("confirm.thisStage"),
              })
        }
        confirmLabel={asked?.reopen ? t("actions.reopen") : t("confirm.move")}
        loading={moving}
        onConfirm={confirmAsked}
      />
    </>
  );
}

type Stage = DealBoardStage["stage"];

function BoardColumn({
  column,
  deals,
  stages,
  rottenDays,
  onMove,
}: {
  column: DealBoardStage;
  deals: Deal[];
  stages: DealBoardStage["stage"][];
  rottenDays?: number;
  onMove: (deal: Deal, stageId: number) => void;
}) {
  const t = useTranslations("deals");
  const locale = useLocale();
  const { stage } = column;
  const { setNodeRef, isOver } = useDroppable({
    id: `stage-${stage.id}`,
    data: { stageId: stage.id },
  });
  const currency = deals[0]?.currency || config.defaultCurrency();
  const tone = stage.is_won ? "won" : stage.is_lost ? "lost" : "open";
  const hidden = column.has_more ? Math.max(0, column.count - deals.length) : 0;

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex h-full w-72 shrink-0 flex-col overflow-hidden rounded-xl border bg-white/60 transition-colors",
        tone === "won" && "border-emerald-200 bg-emerald-50/40",
        tone === "lost" && "border-rose-200 bg-rose-50/40",
        tone === "open" && "border-[var(--border-color,#e5e7eb)]",
        isOver && "border-[#0058cc] bg-[#eef6fc]/70 ring-2 ring-[#0058cc]/20",
      )}
      aria-label={t("board.stageLabel", { stage: stage.name })}
    >
      <header
        className={cn(
          "flex shrink-0 items-center gap-2 border-b px-3 py-2",
          tone === "won" && "border-emerald-200/70",
          tone === "lost" && "border-rose-200/70",
          tone === "open" && "border-gray-100",
        )}
      >
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            tone === "won" ? "bg-emerald-500" : tone === "lost" ? "bg-rose-500" : "bg-[#0058cc]",
          )}
          aria-hidden
        />
        <h2 className="min-w-0 flex-1 truncate text-xs font-semibold tracking-wide text-gray-700 uppercase">
          {stage.name}
        </h2>
        {typeof stage.probability === "number" && !stage.is_won && !stage.is_lost ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-1.5 py-px text-[11px] font-medium text-gray-500">
            {stage.probability}%
            <InfoTip
              label={t("board.probabilityLabel", { probability: stage.probability })}
              className="text-gray-400"
            >
              {t("board.probabilityHint")}
            </InfoTip>
          </span>
        ) : null}
        <Tooltip>
          <TooltipTrigger
            render={
              <span className="shrink-0 cursor-default rounded-full bg-gray-100 px-1.5 py-px text-[11px] font-medium text-gray-600 tabular-nums" />
            }
          >
            {column.count}
          </TooltipTrigger>
          <TooltipContent>{t("board.countInStage", { count: column.count })}</TooltipContent>
        </Tooltip>
      </header>
      <Tooltip>
        <TooltipTrigger
          render={
            <p
              className={cn(
                "shrink-0 cursor-default px-3 py-1.5 text-left text-[11px] font-medium tabular-nums",
                tone === "won"
                  ? "text-emerald-700"
                  : tone === "lost"
                    ? "text-rose-700"
                    : "text-gray-500",
              )}
            />
          }
        >
          {formatCompactCurrency(Number(column.total_value), currency, locale)}
        </TooltipTrigger>
        <TooltipContent side="bottom">{t("board.totalHint")}</TooltipContent>
      </Tooltip>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3">
        {deals.map((deal) => (
          <DraggableDealCard
            key={deal.id}
            deal={deal}
            personName={deal.person_name}
            organizationName={deal.organization_name ?? undefined}
            stale={deal.is_stale}
            rottenDays={rottenDays}
            stages={stages}
            onMove={(stageId) => onMove(deal, stageId)}
          />
        ))}
        {deals.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed border-gray-200 px-3 py-6 text-center text-[11px]">
            {t("board.dropHint", { stage: stage.name })}
          </p>
        ) : null}
        {hidden > 0 ? (
          <p className="text-muted-foreground px-1 pt-1 text-center text-[11px]">
            {t("board.moreCards", { count: hidden })}
          </p>
        ) : null}
      </div>
    </section>
  );
}
