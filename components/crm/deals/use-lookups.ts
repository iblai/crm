"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useListLeadSourcesQuery, useListPipelinesQuery } from "@/lib/crm/api";
import { sortStages } from "@/lib/crm/format";
import type { LeadSource, Pipeline, PipelineStage } from "@/lib/crm/types";

/**
 * The reference data every deal surface needs: the pipelines with their
 * stages and the lead sources. Small and cached by RTK Query, so each surface
 * may call this freely. Person and organization names ride on the deal.
 */
export function useDealLookups(options?: { skip?: boolean }) {
  const t = useTranslations("deals");
  const skip = options?.skip;
  const {
    data: pipelines,
    isLoading: pipelinesLoading,
    error: pipelinesError,
  } = useListPipelinesQuery({ page_size: 100 }, { skip });
  const { data: sources, isLoading: sourcesLoading } = useListLeadSourcesQuery(undefined, { skip });

  const pipelineById = useMemo(
    () => new Map<number, Pipeline>((pipelines?.results ?? []).map((p) => [p.id, p])),
    [pipelines],
  );
  const stageById = useMemo(() => {
    const map = new Map<number, PipelineStage>();
    for (const p of pipelines?.results ?? []) for (const s of p.stages ?? []) map.set(s.id, s);
    return map;
  }, [pipelines]);
  const sourceById = useMemo(
    () => new Map<number, LeadSource>((sources?.results ?? []).map((s) => [s.id, s])),
    [sources],
  );

  const defaultPipeline = useMemo(() => {
    const rows = pipelines?.results ?? [];
    return rows.find((p) => p.is_default) ?? rows[0];
  }, [pipelines]);

  return {
    pipelines: pipelines?.results ?? [],
    sources: sources?.results ?? [],
    pipelineById,
    stageById,
    sourceById,
    defaultPipeline,
    stageName: (id?: number | null) =>
      id ? (stageById.get(id)?.name ?? t("fields.stageFallback", { id })) : "—",
    sourceName: (id?: number | null) =>
      id ? (sourceById.get(id)?.name ?? t("fields.sourceFallback", { id })) : "",
    isLoading: pipelinesLoading || sourcesLoading,
    /** The pipelines request failed: nothing below can render. */
    error: pipelinesError,
  };
}

/** Stages of a pipeline, in board order. */
export function pipelineStages(pipeline?: Pipeline) {
  return sortStages(pipeline?.stages ?? []);
}

/** The stages a deal can be created in / reopened into. */
export function openStages(pipeline?: Pipeline) {
  return pipelineStages(pipeline).filter((s) => !s.is_won && !s.is_lost);
}
