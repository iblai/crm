"use client";

import type { CSSProperties, Ref } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, Clock, GripVertical, MoveRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EntityAvatar } from "@/components/crm/entity-avatar";
import { TagList } from "@/components/crm/tag-chip";
import { OwnerAvatar } from "@/components/crm/deals/owner-avatar";
import { useSession } from "@/hooks/use-session";
import { formatCurrency, formatDate, toDate } from "@/lib/crm/format";
import type { Deal, DealStatus, PipelineStage } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

/** Past its expected close date while still open. Kept out of render bodies. */
export function isOverdue(expected?: string | null, status?: DealStatus) {
  const due = toDate(expected);
  return !!due && status === "open" && due.getTime() < Date.now();
}

export interface DealCardProps {
  deal: Deal;
  personName: string;
  organizationName?: string;
  /** Open past its pipeline's `rotten_days` — Twenty's "rotten" deal. */
  stale?: boolean;
  /** The pipeline's rotten threshold, named in the stale badge's tooltip. */
  rottenDays?: number;
  /** Stages offered by the card's "Move to…" menu (keyboard-less fallback). */
  stages?: PipelineStage[];
  onMove?: (stageId: number) => void;
}

/** The presentational kanban card — also what `DragOverlay` renders. */
export function DealCard({
  deal,
  personName,
  organizationName,
  stale,
  rottenDays,
  stages,
  onMove,
  dragging,
  overlay,
  style,
  handleProps,
  nodeRef,
}: DealCardProps & {
  dragging?: boolean;
  overlay?: boolean;
  style?: CSSProperties;
  handleProps?: Record<string, unknown>;
  nodeRef?: Ref<HTMLDivElement>;
}) {
  const t = useTranslations("deals");
  const locale = useLocale();
  const router = useRouter();
  const { href } = useSession();
  const due = toDate(deal.expected_close_date);
  const shortDue = formatDate(deal.expected_close_date, locale, { month: "short", day: "numeric" });
  const fullDue = formatDate(deal.expected_close_date, locale);
  const overdue = isOverdue(deal.expected_close_date, deal.status);
  const others = (stages ?? []).filter((s) => s.id !== deal.stage);
  const showMenu = others.length > 0 && !!onMove && !overlay;

  return (
    <div
      ref={nodeRef}
      style={style}
      className={cn(
        "group/card relative touch-manipulation",
        dragging && "opacity-40",
        overlay && "rotate-2",
      )}
    >
      <button
        type="button"
        onClick={() => router.push(href(`/deals/${deal.id}`))}
        {...handleProps}
        className={cn(
          "block w-full cursor-pointer rounded-lg border border-[var(--border-color,#e5e7eb)] bg-white p-2.5 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow outline-none hover:border-[#0058cc]/40 hover:shadow-[0_2px_8px_rgba(16,24,40,0.08)] focus-visible:ring-2 focus-visible:ring-[#0058cc]/40",
          overlay && "cursor-grabbing shadow-[0_12px_28px_rgba(16,24,40,0.18)]",
        )}
      >
        <span className="flex items-start gap-1.5">
          <GripVertical className="mt-0.5 size-3.5 shrink-0 text-gray-300 opacity-0 transition-opacity group-hover/card:opacity-100 pointer-coarse:opacity-100" />
          <span
            className={cn(
              "line-clamp-2 min-w-0 flex-1 text-sm leading-snug font-medium text-gray-900",
              showMenu && "pr-5",
            )}
          >
            {deal.title}
          </span>
        </span>

        <span className="mt-2 flex min-w-0 items-center gap-1.5">
          <EntityAvatar name={personName} seed={deal.person} size="xs" />
          <span className="min-w-0 flex-1 truncate text-xs text-gray-600">{personName}</span>
        </span>
        {organizationName ? (
          <span className="text-muted-foreground mt-1 block truncate pl-6.5 text-[11px]">
            {organizationName}
          </span>
        ) : null}

        <span className="mt-2.5 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold tracking-tight text-gray-900 tabular-nums">
            {formatCurrency(deal.lead_value, deal.currency, locale)}
          </span>
          <OwnerAvatar ownerId={deal.owner} />
        </span>

        {due || stale ? (
          <span className="mt-2 flex flex-wrap items-center gap-1.5">
            {due ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      className={cn(
                        "inline-flex cursor-default items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                        overdue ? "bg-rose-50 text-rose-600" : "bg-gray-100 text-gray-600",
                      )}
                    />
                  }
                >
                  <CalendarDays className="size-3" />
                  {overdue ? t("closeDate.overdue", { date: shortDue }) : shortDue}
                </TooltipTrigger>
                <TooltipContent>
                  {overdue
                    ? t("closeDate.expectedPassed", { date: fullDue })
                    : t("closeDate.expected", { date: fullDue })}
                </TooltipContent>
              </Tooltip>
            ) : null}
            {stale ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span className="inline-flex cursor-default items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700" />
                  }
                >
                  <Clock className="size-3" /> {t("card.stale")}
                </TooltipTrigger>
                <TooltipContent>
                  {rottenDays
                    ? t("card.staleHint", { days: rottenDays })
                    : t("card.staleHintNoDays")}
                </TooltipContent>
              </Tooltip>
            ) : null}
          </span>
        ) : null}

        {deal.tags?.length ? (
          <span className="mt-2 block">
            <TagList tags={deal.tags} size="xs" max={2} />
          </span>
        ) : null}
      </button>

      {showMenu ? (
        <div className="absolute top-1.5 right-1.5">
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger
                render={
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={t("card.moveLabel")}
                        className="text-gray-400 opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100 pointer-coarse:opacity-100"
                      />
                    }
                    onPointerDown={(e) => e.stopPropagation()}
                  />
                }
              >
                <MoveRight />
              </TooltipTrigger>
              <TooltipContent>{t("card.moveHint")}</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("card.moveTo")}</DropdownMenuLabel>
                {others.map((s) => (
                  <DropdownMenuItem key={s.id} onClick={() => onMove?.(s.id)}>
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        s.is_won ? "bg-emerald-500" : s.is_lost ? "bg-rose-500" : "bg-[#0058cc]",
                      )}
                      aria-hidden
                    />
                    {s.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
    </div>
  );
}

/** The draggable wrapper used inside the board columns. */
export function DraggableDealCard(props: DealCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `deal-${props.deal.id}`,
    data: { dealId: props.deal.id, stageId: props.deal.stage },
  });
  return (
    <DealCard
      {...props}
      nodeRef={setNodeRef}
      dragging={isDragging}
      style={{ transform: CSS.Translate.toString(transform) }}
      handleProps={{ ...attributes, ...listeners }}
    />
  );
}
