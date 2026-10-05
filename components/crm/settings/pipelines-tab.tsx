"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CheckCircle2,
  GitBranch,
  GripVertical,
  Layers,
  Plus,
  Star,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@iblai/iblai-js/web-containers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/crm/empty-state";
import { InfoTip } from "@/components/crm/info-tip";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { InlineText } from "@/components/crm/inline-field";
import { SimpleSelect } from "@/components/crm/simple-select";
import { slugify, useToastSettingsError } from "@/components/crm/settings/utils";
import {
  errorStatus,
  useCreatePipelineMutation,
  useCreateStageMutation,
  useDeletePipelineMutation,
  useDeleteStageMutation,
  useListPipelinesQuery,
  useListStagesQuery,
  useUpdatePipelineMutation,
  useReorderStagesMutation,
  useUpdateStageMutation,
} from "@/lib/crm/api";
import { sortStages } from "@/lib/crm/format";
import { useCrmEnums } from "@/lib/crm/i18n";
import type { Pipeline, PipelineInput, PipelineStage, PipelineStageInput } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

type Terminal = "flight" | "won" | "lost";

function useTerminalOptions() {
  const t = useTranslations("settings");
  const { dealStatus } = useCrmEnums();
  return [
    { value: "flight", label: t("pipelines.inFlight") },
    { value: "won", label: dealStatus("won") },
    { value: "lost", label: dealStatus("lost") },
  ];
}

function terminalOf(stage: Pick<PipelineStage, "is_won" | "is_lost">): Terminal {
  if (stage.is_won) return "won";
  if (stage.is_lost) return "lost";
  return "flight";
}

/** A stage is never both won and lost — the picker encodes that. */
function terminalBody(value: Terminal) {
  return { is_won: value === "won", is_lost: value === "lost" };
}

export function PipelinesTab() {
  const t = useTranslations("settings");
  const { data, isLoading } = useListPipelinesQuery({ page_size: 100 });
  const pipelines = useMemo(() => data?.results ?? [], [data]);
  const [pickedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  // The pipeline the user picked, as long as it still exists — otherwise the
  // default one, otherwise the first. Derived, so a refetch never strands us.
  const selected =
    pipelines.find((p) => p.id === pickedId) ?? pipelines.find((p) => p.is_default) ?? pipelines[0];
  const selectedId = selected?.id ?? null;

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!pipelines.length) {
    return (
      <>
        <EmptyState
          icon={<GitBranch />}
          title={t("pipelines.emptyTitle")}
          description={t("pipelines.emptyDescription")}
          action={
            <Button className="ibl-button-primary" onClick={() => setCreating(true)}>
              <Plus data-icon="inline-start" /> {t("pipelines.new")}
            </Button>
          }
        />
        <PipelineDialog open={creating} onOpenChange={setCreating} onCreated={setSelectedId} />
      </>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="flex flex-col gap-2 rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-2 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <ul className="flex flex-col gap-1">
          {pipelines.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setSelectedId(p.id)}
                aria-current={p.id === selectedId ? "true" : undefined}
                className={cn(
                  "flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                  p.id === selectedId ? "bg-[#eef6fc]" : "hover:bg-gray-50",
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "truncate text-sm font-medium",
                      p.id === selectedId ? "text-[#0058cc]" : "text-gray-900",
                    )}
                  >
                    {p.name}
                  </span>
                  {p.is_default ? (
                    <span className="rounded-full bg-[#0058cc]/10 px-1.5 py-px text-[10px] font-semibold text-[#0058cc]">
                      {t("pipelines.default")}
                    </span>
                  ) : null}
                </span>
                <span className="text-muted-foreground flex items-center gap-2 text-[11px]">
                  <span className="font-mono">{p.code}</span>
                  <span>·</span>
                  <span>{t("pipelines.stageCount", { count: p.stages?.length ?? 0 })}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <Button
          variant="outline"
          size="sm"
          className="justify-start border-dashed"
          onClick={() => setCreating(true)}
        >
          <Plus data-icon="inline-start" /> {t("pipelines.new")}
        </Button>
      </aside>

      {selected ? (
        <PipelineEditor pipeline={selected} onDeleted={() => setSelectedId(null)} />
      ) : null}

      <PipelineDialog open={creating} onOpenChange={setCreating} onCreated={setSelectedId} />
    </div>
  );
}

function PipelineEditor({ pipeline, onDeleted }: { pipeline: Pipeline; onDeleted: () => void }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const toastSettingsError = useToastSettingsError();
  const [update] = useUpdatePipelineMutation();
  const [remove, { isLoading: removing }] = useDeletePipelineMutation();
  const [confirm, setConfirm] = useState(false);
  const [makingDefault, setMakingDefault] = useState(false);

  const patch = async (body: PipelineInput) => {
    try {
      await update({ id: pipeline.id, body }).unwrap();
    } catch (err) {
      toastSettingsError(err);
    }
  };

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="max-w-md text-lg font-semibold text-gray-900">
              <InlineText
                value={pipeline.name}
                onSave={(v) => (v.trim() ? patch({ name: v.trim() }) : undefined)}
                placeholder={t("pipelines.namePlaceholder")}
              />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-600">
                {pipeline.code}
              </span>
              {pipeline.is_default ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#0058cc]/10 px-2 py-0.5 text-[11px] font-semibold text-[#0058cc]">
                  <Star className="size-3" /> {t("pipelines.defaultPipeline")}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!pipeline.is_default ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={makingDefault}
                      onClick={async () => {
                        setMakingDefault(true);
                        try {
                          await update({ id: pipeline.id, body: { is_default: true } }).unwrap();
                          toast.success(t("pipelines.madeDefault", { name: pipeline.name }));
                        } catch (err) {
                          toastSettingsError(err);
                        } finally {
                          setMakingDefault(false);
                        }
                      }}
                    />
                  }
                >
                  <Star data-icon="inline-start" /> {t("pipelines.makeDefault")}
                </TooltipTrigger>
                <TooltipContent side="bottom">{t("pipelines.makeDefaultHint")}</TooltipContent>
              </Tooltip>
            ) : null}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-rose-600"
                    onClick={() => setConfirm(true)}
                  />
                }
              >
                <Trash2 data-icon="inline-start" /> {tc("delete")}
              </TooltipTrigger>
              <TooltipContent side="bottom">{t("pipelines.deleteHint")}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <dl className="mt-4 grid gap-3 border-t border-gray-100 pt-3 sm:grid-cols-2">
          <div className="grid grid-cols-[8rem_minmax(0,1fr)] items-center gap-2">
            <dt className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
              {t("pipelines.rottenAfter")}
              <InfoTip label={t("pipelines.rottenLabel")}>{t("pipelines.rottenTip")}</InfoTip>
            </dt>
            <dd className="flex items-center gap-1.5 text-sm text-gray-900">
              <div className="w-20">
                <InlineText
                  value={String(pipeline.rotten_days ?? 30)}
                  type="number"
                  onSave={(v) => {
                    const n = Number(v);
                    if (!Number.isFinite(n) || n < 0) return;
                    return patch({ rotten_days: Math.round(n) });
                  }}
                />
              </div>
              <span className="text-muted-foreground text-xs">{t("pipelines.rottenUnit")}</span>
            </dd>
          </div>
          <div className="grid grid-cols-[8rem_minmax(0,1fr)] items-center gap-2">
            <dt className="text-muted-foreground text-xs font-medium">{t("stages.title")}</dt>
            <dd className="text-sm text-gray-900">{pipeline.stages?.length ?? 0}</dd>
          </div>
        </dl>
      </div>

      <StagesEditor pipeline={pipeline} />

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t("deleteTitle", { name: pipeline.name })}
        description={t("pipelines.deleteDescription")}
        confirmLabel={t("pipelines.deleteConfirm")}
        destructive
        loading={removing}
        onConfirm={async () => {
          try {
            await remove(pipeline.id).unwrap();
            setConfirm(false);
            onDeleted();
            toast.success(t("pipelines.deleted"));
          } catch (err) {
            if (errorStatus(err) === 409) {
              toast.error(t("pipelines.deleteBlocked"));
            } else {
              toastSettingsError(err);
            }
          }
        }}
      />
    </section>
  );
}

function StagesEditor({ pipeline }: { pipeline: Pipeline }) {
  const t = useTranslations("settings");
  const toastSettingsError = useToastSettingsError();
  const { data, isLoading } = useListStagesQuery({ pipeline: pipeline.id });
  const [reorderStages] = useReorderStagesMutation();
  const [adding, setAdding] = useState(false);
  const [order, setOrder] = useState<PipelineStage[]>([]);
  const [reordering, setReordering] = useState(false);

  const stages = useMemo(() => sortStages(data?.results ?? []), [data]);

  useEffect(() => {
    setOrder(stages);
  }, [stages]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = order.findIndex((s) => s.id === active.id);
    const to = order.findIndex((s) => s.id === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(order, from, to);
    setOrder(next);
    setReordering(true);
    try {
      await reorderStages({ pipeline: pipeline.id, order: next.map((s) => s.id) }).unwrap();
      toast.success(t("stages.orderSaved"));
    } catch (err) {
      setOrder(stages);
      toastSettingsError(err);
    } finally {
      setReordering(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-[#0058cc]" strokeWidth={1.75} />
          <h3 className="text-sm font-semibold text-gray-900">{t("stages.title")}</h3>
          <span className="text-muted-foreground text-[11px]">{t("stages.reorderHint")}</span>
          {reordering ? <Spinner className="text-muted-foreground size-3.5" /> : null}
        </div>
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
          <Plus data-icon="inline-start" /> {t("stages.add")}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2 p-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : order.length === 0 ? (
        <p className="text-muted-foreground p-8 text-center text-sm">{t("stages.empty")}</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) => void onDragEnd(e)}
        >
          <SortableContext items={order.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <ul className="divide-y divide-gray-100">
              {order.map((stage) => (
                <StageRow key={stage.id} stage={stage} pipelineId={pipeline.id} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <AddStageDialog
        open={adding}
        onOpenChange={setAdding}
        pipelineId={pipeline.id}
        nextSortOrder={order.length ? Math.max(...order.map((s) => s.sort_order ?? 0)) + 1 : 0}
      />
    </div>
  );
}

function StageRow({ stage, pipelineId }: { stage: PipelineStage; pipelineId: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.id,
  });
  const t = useTranslations("settings");
  const toastSettingsError = useToastSettingsError();
  const terminalOptions = useTerminalOptions();
  const [updateStage] = useUpdateStageMutation();
  const [removeStage, { isLoading: removing }] = useDeleteStageMutation();
  const [confirm, setConfirm] = useState(false);
  const terminal = terminalOf(stage);
  const probability = Math.max(0, Math.min(100, stage.probability ?? 0));

  const patch = async (body: PipelineStageInput) => {
    try {
      await updateStage({ pipeline: pipelineId, id: stage.id, body }).unwrap();
    } catch (err) {
      toastSettingsError(err);
    }
  };

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 bg-white px-3 py-2.5",
        isDragging && "relative z-10 rounded-lg shadow-[0_6px_16px_rgba(16,24,40,0.12)]",
      )}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              className="shrink-0 cursor-grab touch-none rounded p-1 text-gray-300 hover:text-gray-500 active:cursor-grabbing"
              aria-label={t("stages.reorderLabel", { name: stage.name })}
              {...attributes}
              {...listeners}
            />
          }
        >
          <GripVertical className="size-4" strokeWidth={1.75} />
        </TooltipTrigger>
        <TooltipContent side="right">{t("stages.dragHint")}</TooltipContent>
      </Tooltip>

      <div className="min-w-40 flex-1 text-sm font-medium text-gray-900">
        <InlineText
          value={stage.name}
          onSave={(v) => (v.trim() ? patch({ name: v.trim() }) : undefined)}
          placeholder={t("stages.namePlaceholder")}
        />
      </div>

      <span className="shrink-0 rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-600">
        {stage.code}
      </span>

      <div className="flex shrink-0 items-center gap-2">
        <div className="w-14">
          <InlineText
            value={String(probability)}
            type="number"
            onSave={(v) => {
              const n = Number(v);
              if (!Number.isFinite(n)) return;
              return patch({ probability: Math.max(0, Math.min(100, Math.round(n))) });
            }}
          />
        </div>
        <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
          %<InfoTip label={t("stages.probabilityLabel")}>{t("stages.probabilityTip")}</InfoTip>
        </span>
        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100" aria-hidden>
          <div className="h-full rounded-full bg-[#0058cc]" style={{ width: `${probability}%` }} />
        </div>
      </div>

      <Tooltip>
        <TooltipTrigger render={<div className="w-32 shrink-0" />}>
          <SimpleSelect
            value={terminal}
            onChange={(v) => void patch(terminalBody(v as Terminal))}
            options={terminalOptions}
            size="sm"
            aria-label={t("stages.outcomeOf", { name: stage.name })}
          />
        </TooltipTrigger>
        <TooltipContent side="bottom">{t("stages.outcomeHint")}</TooltipContent>
      </Tooltip>

      <span className="hidden w-5 shrink-0 sm:block">
        {terminal === "won" ? <CheckCircle2 className="size-4 text-emerald-500" /> : null}
        {terminal === "lost" ? <XCircle className="size-4 text-rose-500" /> : null}
      </span>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-gray-400 hover:text-rose-600"
              onClick={() => setConfirm(true)}
              aria-label={t("stages.deleteLabel", { name: stage.name })}
            />
          }
        >
          <Trash2 />
        </TooltipTrigger>
        <TooltipContent side="left">{t("stages.deleteHint")}</TooltipContent>
      </Tooltip>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t("stages.deleteTitle", { name: stage.name })}
        description={t("stages.deleteDescription")}
        confirmLabel={t("stages.deleteConfirm")}
        destructive
        loading={removing}
        onConfirm={async () => {
          try {
            await removeStage({ pipeline: pipelineId, id: stage.id }).unwrap();
            setConfirm(false);
            toast.success(t("stages.deleted"));
          } catch (err) {
            if (errorStatus(err) === 409) {
              toast.error(t("stages.deleteBlocked"));
            } else {
              toastSettingsError(err);
            }
          }
        }}
      />
    </li>
  );
}

function PipelineDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: number) => void;
}) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const toastSettingsError = useToastSettingsError();
  const [create, { isLoading }] = useCreatePipelineMutation();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [rottenDays, setRottenDays] = useState("30");
  const [isDefault, setIsDefault] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setCode("");
    setCodeTouched(false);
    setRottenDays("30");
    setIsDefault(false);
    setTouched(false);
  }, [open]);

  const invalid = !name.trim() || !code.trim();

  const submit = async () => {
    setTouched(true);
    if (invalid) return;
    try {
      const pipeline = await create({
        name: name.trim(),
        code: code.trim(),
        rotten_days: Math.max(0, Math.round(Number(rottenDays) || 30)),
        is_default: isDefault,
      }).unwrap();
      toast.success(t("pipelines.created", { name: pipeline.name }));
      onCreated?.(pipeline.id);
      onOpenChange(false);
    } catch (err) {
      toastSettingsError(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className="p-4 pb-3">
          <DialogTitle>{t("pipelines.new")}</DialogTitle>
          <DialogDescription>{t("pipelines.dialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3.5 px-4 pb-4">
          <div className="grid gap-1.5">
            <Label htmlFor="pipeline-name" className="text-muted-foreground text-xs">
              {tc("name")}
            </Label>
            <Input
              id="pipeline-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!codeTouched) setCode(slugify(e.target.value));
              }}
              placeholder={t("pipelines.nameExample")}
              className="h-8 text-sm"
              aria-invalid={touched && !name.trim()}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pipeline-code" className="text-muted-foreground text-xs">
              {t("code")}
            </Label>
            <Input
              id="pipeline-code"
              value={code}
              onChange={(e) => {
                setCodeTouched(true);
                setCode(slugify(e.target.value));
              }}
              placeholder={t("pipelines.codeExample")}
              className="h-8 font-mono text-sm"
              aria-invalid={touched && !code.trim()}
            />
            <p className="text-muted-foreground text-[11px]">{t("codeHint")}</p>
          </div>
          <div className="grid gap-1.5">
            <Label
              htmlFor="pipeline-rotten"
              className="text-muted-foreground flex items-center gap-1 text-xs"
            >
              {t("pipelines.rottenAfterDays")}
              <InfoTip label={t("pipelines.rottenLabel")}>{t("pipelines.rottenTip")}</InfoTip>
            </Label>
            <Input
              id="pipeline-rotten"
              type="number"
              min={0}
              value={rottenDays}
              onChange={(e) => setRottenDays(e.target.value)}
              className="h-8 w-28 text-sm"
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-color,#e5e7eb)] px-3 py-2">
            <div>
              <p className="text-sm font-medium text-gray-900">{t("pipelines.makeItDefault")}</p>
              <p className="text-muted-foreground text-[11px]">
                {t("pipelines.makeItDefaultHint")}
              </p>
            </div>
            <Switch
              checked={isDefault}
              onCheckedChange={setIsDefault}
              aria-label={t("pipelines.makeItDefaultLabel")}
            />
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 rounded-b-xl">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {tc("cancel")}
          </Button>
          <Button className="ibl-button-primary" onClick={() => void submit()} disabled={isLoading}>
            {isLoading ? <Spinner size="sm" className="size-4 text-current" /> : null}
            {t("pipelines.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddStageDialog({
  open,
  onOpenChange,
  pipelineId,
  nextSortOrder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: number;
  nextSortOrder: number;
}) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const toastSettingsError = useToastSettingsError();
  const terminalOptions = useTerminalOptions();
  const [create, { isLoading }] = useCreateStageMutation();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [probability, setProbability] = useState("50");
  const [terminal, setTerminal] = useState<Terminal>("flight");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setCode("");
    setCodeTouched(false);
    setProbability("50");
    setTerminal("flight");
    setTouched(false);
  }, [open]);

  const invalid = !name.trim() || !code.trim();

  const submit = async () => {
    setTouched(true);
    if (invalid) return;
    try {
      await create({
        pipeline: pipelineId,
        body: {
          name: name.trim(),
          code: code.trim(),
          probability: Math.max(0, Math.min(100, Math.round(Number(probability) || 0))),
          sort_order: nextSortOrder,
          ...terminalBody(terminal),
        },
      }).unwrap();
      toast.success(t("stages.added"));
      onOpenChange(false);
    } catch (err) {
      toastSettingsError(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className="p-4 pb-3">
          <DialogTitle>{t("stages.add")}</DialogTitle>
          <DialogDescription>{t("stages.dialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3.5 px-4 pb-4">
          <div className="grid gap-1.5">
            <Label htmlFor="stage-name" className="text-muted-foreground text-xs">
              {tc("name")}
            </Label>
            <Input
              id="stage-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!codeTouched) setCode(slugify(e.target.value));
              }}
              placeholder={t("stages.nameExample")}
              className="h-8 text-sm"
              aria-invalid={touched && !name.trim()}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="stage-code" className="text-muted-foreground text-xs">
              {t("code")}
            </Label>
            <Input
              id="stage-code"
              value={code}
              onChange={(e) => {
                setCodeTouched(true);
                setCode(slugify(e.target.value));
              }}
              placeholder={t("stages.codeExample")}
              className="h-8 font-mono text-sm"
              aria-invalid={touched && !code.trim()}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="stage-probability" className="text-muted-foreground text-xs">
                {t("stages.probability")}
              </Label>
              <Input
                id="stage-probability"
                type="number"
                min={0}
                max={100}
                value={probability}
                onChange={(e) => setProbability(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-muted-foreground text-xs">{t("stages.outcome")}</Label>
              <SimpleSelect
                value={terminal}
                onChange={(v) => setTerminal(v as Terminal)}
                options={terminalOptions}
                size="sm"
                aria-label={t("stages.outcomeLabel")}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 rounded-b-xl">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {tc("cancel")}
          </Button>
          <Button className="ibl-button-primary" onClick={() => void submit()} disabled={isLoading}>
            {isLoading ? <Spinner size="sm" className="size-4 text-current" /> : null}
            {t("stages.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
