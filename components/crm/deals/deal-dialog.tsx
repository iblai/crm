"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Handshake } from "lucide-react";
import { useTranslations, type Messages } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@iblai/iblai-js/web-containers";
import { InfoTip } from "@/components/crm/info-tip";
import { SearchPicker } from "@/components/crm/search-picker";
import { SimpleSelect } from "@/components/crm/simple-select";
import { OwnerSelect } from "@/components/crm/owner-select";
import { openStages, useDealLookups } from "@/components/crm/deals/use-lookups";
import { useSession } from "@/hooks/use-session";
import { errorMessage, useCreateDealMutation, useGetPersonQuery } from "@/lib/crm/api";
import type { Deal } from "@/lib/crm/types";
import config from "@/lib/iblai/config";
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

/** Create a deal — the one place deals are born (person and stage required). */
export function DealDialog({
  open,
  onOpenChange,
  defaultPerson,
  defaultOrganization,
  defaultPipeline,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPerson?: string | null;
  defaultOrganization?: string | null;
  defaultPipeline?: number | null;
  onCreated?: (deal: Deal) => void;
}) {
  const t = useTranslations("deals");
  const tc = useTranslations("common");
  const about = (field: keyof Messages["deals"]["fields"]) =>
    t("dialog.fieldAbout", { field: t(`fields.${field}`).toLowerCase() });
  const router = useRouter();
  const { href, userId } = useSession();
  const lookups = useDealLookups({ skip: !open });
  const [createDeal, { isLoading }] = useCreateDealMutation();

  const [title, setTitle] = useState("");
  const [personId, setPersonId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [pipelineId, setPipelineId] = useState("");
  const [stageId, setStageId] = useState("");
  const [value, setValue] = useState("");
  const [currency, setCurrency] = useState(config.defaultCurrency());
  const [sourceId, setSourceId] = useState("");
  const [expectedClose, setExpectedClose] = useState("");
  const [owner, setOwner] = useState<number | null>(userId ?? null);
  const [description, setDescription] = useState("");
  const [touched, setTouched] = useState(false);

  // The person may not be on the first page the picker lists (deep links).
  const { data: seededPerson } = useGetPersonQuery(defaultPerson ?? "", {
    skip: !open || !defaultPerson,
  });

  // Reset to the defaults each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setTitle("");
    setPersonId(defaultPerson ?? "");
    setOrganizationId(defaultOrganization ?? "");
    setValue("");
    setCurrency(config.defaultCurrency());
    setSourceId("");
    setExpectedClose("");
    setDescription("");
    setOwner(userId ?? null);
    setTouched(false);
    if (defaultPipeline) setPipelineId(String(defaultPipeline));
  }, [open, defaultPerson, defaultOrganization, defaultPipeline, userId]);

  // Default the pipeline once the list arrives.
  useEffect(() => {
    if (!open) return;
    const fallback = defaultPipeline ?? lookups.defaultPipeline?.id;
    if (fallback && !pipelineId) setPipelineId(String(fallback));
  }, [open, defaultPipeline, lookups.defaultPipeline, pipelineId]);

  const pipeline = lookups.pipelineById.get(Number(pipelineId));
  const stages = useMemo(() => openStages(pipeline), [pipeline]);

  // Keep the stage inside the selected pipeline.
  useEffect(() => {
    if (stages.length === 0) return;
    if (!stages.some((s) => String(s.id) === stageId)) setStageId(String(stages[0].id));
  }, [stages, stageId]);

  // A deep-linked person brings their company along.
  useEffect(() => {
    if (!seededPerson?.organization || seededPerson.id !== personId || organizationId) return;
    setOrganizationId(seededPerson.organization);
  }, [seededPerson, personId, organizationId]);

  const currencyOptions = useMemo(() => {
    const all = new Set([config.defaultCurrency(), ...CURRENCIES]);
    return [...all].filter(Boolean).map((c) => ({ value: c, label: c }));
  }, []);

  const valid = title.trim().length > 0 && !!personId && !!pipelineId && !!stageId;

  const submit = async () => {
    setTouched(true);
    if (!valid || isLoading) return;
    try {
      const deal = await createDeal({
        title: title.trim(),
        person: personId,
        organization: organizationId || null,
        pipeline: Number(pipelineId),
        stage: Number(stageId),
        lead_value: value.trim() ? String(Number(value)) : undefined,
        currency,
        source: sourceId ? Number(sourceId) : null,
        expected_close_date: expectedClose || null,
        owner: owner ?? null,
        description: description.trim() || undefined,
      }).unwrap();
      toast.success(t("toast.created", { title: deal.title }));
      onOpenChange(false);
      onCreated?.(deal);
      router.push(href(`/deals/${deal.id}`));
    } catch (err) {
      toast.error(errorMessage(err, t("toast.createFailed")));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-[#eef6fc] text-[#0058cc]">
              <Handshake className="size-4" />
            </span>
            {t("newDeal")}
          </DialogTitle>
          <DialogDescription>{t("dialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-0.5 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="deal-title">{t("fields.title")}</Label>
            <Input
              id="deal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("dialog.titlePlaceholder")}
              aria-invalid={touched && !title.trim()}
            />
          </div>

          <div className="grid gap-1.5 sm:col-span-2">
            <Label className="flex items-center gap-1">
              {t("fields.person")}
              <InfoTip label={about("person")}>{t("dialog.personHint")}</InfoTip>
            </Label>
            <SearchPicker
              kind="person"
              value={personId || null}
              onChange={(id, hit) => {
                setPersonId(id ?? "");
                if (hit?.organization && !organizationId) setOrganizationId(hit.organization);
              }}
              placeholder={t("dialog.personPlaceholder")}
              invalid={touched && !personId}
              className="h-9"
            />
          </div>

          <div className="grid gap-1.5 sm:col-span-2">
            <Label>{t("fields.company")}</Label>
            <SearchPicker
              kind="organization"
              value={organizationId || null}
              onChange={(id) => setOrganizationId(id ?? "")}
              placeholder={t("fields.noCompany")}
              className="h-9"
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="flex items-center gap-1">
              {t("fields.pipeline")}
              <InfoTip label={about("pipeline")}>{t("dialog.pipelineHint")}</InfoTip>
            </Label>
            <SimpleSelect
              value={pipelineId}
              onChange={setPipelineId}
              options={lookups.pipelines.map((p) => ({ value: String(p.id), label: p.name }))}
              placeholder={t("fields.pipeline")}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="flex items-center gap-1">
              {t("fields.stage")}
              <InfoTip label={about("stage")}>{t("dialog.stageHint")}</InfoTip>
            </Label>
            <SimpleSelect
              value={stageId}
              onChange={setStageId}
              options={stages.map((s) => ({ value: String(s.id), label: s.name }))}
              placeholder={t("fields.stage")}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="deal-value" className="flex items-center gap-1">
              {t("fields.value")}
              <InfoTip label={about("value")}>{t("dialog.valueHint")}</InfoTip>
            </Label>
            <Input
              id="deal-value"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="flex items-center gap-1">
              {t("fields.currency")}
              <InfoTip label={about("currency")}>{t("dialog.currencyHint")}</InfoTip>
            </Label>
            <SimpleSelect value={currency} onChange={setCurrency} options={currencyOptions} />
          </div>

          <div className="grid gap-1.5">
            <Label className="flex items-center gap-1">
              {t("fields.source")}
              <InfoTip label={about("source")}>{t("dialog.sourceHint")}</InfoTip>
            </Label>
            <SimpleSelect
              value={sourceId}
              onChange={setSourceId}
              options={lookups.sources.map((s) => ({ value: String(s.id), label: s.name }))}
              allowEmpty
              emptyLabel={t("fields.noSource")}
              placeholder={t("fields.noSource")}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="deal-close" className="flex items-center gap-1">
              {t("fields.expectedClose")}
              <InfoTip label={about("expectedClose")}>{t("dialog.expectedCloseHint")}</InfoTip>
            </Label>
            <Input
              id="deal-close"
              type="date"
              value={expectedClose}
              onChange={(e) => setExpectedClose(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5 sm:col-span-2">
            <Label>{tc("owner")}</Label>
            <OwnerSelect value={owner} onChange={setOwner} />
          </div>

          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="deal-description">{tc("description")}</Label>
            <Textarea
              id="deal-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("dialog.descriptionPlaceholder")}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {tc("cancel")}
          </Button>
          <Button
            className={cn("ibl-button-primary")}
            disabled={!valid || isLoading}
            onClick={() => void submit()}
          >
            {isLoading ? <Spinner size="sm" className="size-4 text-current" /> : null}
            {t("dialog.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
