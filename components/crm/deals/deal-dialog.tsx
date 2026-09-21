"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Handshake } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { EntityAvatar } from "@/components/crm/entity-avatar";
import { SimpleSelect } from "@/components/crm/simple-select";
import { OwnerSelect } from "@/components/crm/owner-select";
import { openStages, useDealLookups } from "@/components/crm/deals/use-lookups";
import { useSession } from "@/hooks/use-session";
import { errorMessage, useCreateDealMutation, useGetPersonQuery } from "@/lib/crm/api";
import type { Deal } from "@/lib/crm/types";
import config from "@/lib/iblai/config";
import { cn } from "@/lib/utils";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "CHF", "JPY", "INR", "BRL", "MXN", "SGD", "ZAR"];

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
  const router = useRouter();
  const { href, userId } = useSession();
  const lookups = useDealLookups({ skip: !open });
  const [createDeal, { isLoading }] = useCreateDealMutation();

  const [title, setTitle] = useState("");
  const [personId, setPersonId] = useState("");
  const [personOpen, setPersonOpen] = useState(false);
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
  const selectedPerson =
    lookups.personById.get(personId) ?? (seededPerson?.id === personId ? seededPerson : undefined);

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

  // Inherit the person's organization when the user has not picked one.
  useEffect(() => {
    if (!selectedPerson?.organization || organizationId) return;
    setOrganizationId(selectedPerson.organization);
  }, [selectedPerson, organizationId]);

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
      toast.success(`Deal “${deal.title}” created`);
      onOpenChange(false);
      onCreated?.(deal);
      router.push(href(`/deals/${deal.id}`));
    } catch (err) {
      toast.error(errorMessage(err, "Could not create the deal"));
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
            New deal
          </DialogTitle>
          <DialogDescription>
            Deals belong to a person and live in one stage of a pipeline.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-0.5 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="deal-title">Title</Label>
            <Input
              id="deal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enterprise licence — 25 seats"
              aria-invalid={touched && !title.trim()}
            />
          </div>

          <div className="grid gap-1.5 sm:col-span-2">
            <Label>Person</Label>
            <Popover open={personOpen} onOpenChange={setPersonOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className="h-9 w-full justify-between font-normal"
                    aria-invalid={touched && !personId}
                  />
                }
              >
                {selectedPerson ? (
                  <span className="flex min-w-0 items-center gap-2">
                    <EntityAvatar name={selectedPerson.name} seed={selectedPerson.id} size="xs" />
                    <span className="truncate">{selectedPerson.name}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">Search for a person…</span>
                )}
                <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search people…" />
                  <CommandList>
                    <CommandEmpty>No person found.</CommandEmpty>
                    <CommandGroup>
                      {lookups.persons.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={`${p.name} ${p.primary_email ?? ""}`}
                          onSelect={() => {
                            setPersonId(p.id);
                            if (p.organization) setOrganizationId(p.organization);
                            setPersonOpen(false);
                          }}
                        >
                          <EntityAvatar name={p.name} seed={p.id} size="xs" />
                          <span className="min-w-0 flex-1 truncate">
                            {p.name}
                            {p.primary_email ? (
                              <span className="ml-1.5 text-xs text-muted-foreground">
                                {p.primary_email}
                              </span>
                            ) : null}
                          </span>
                          {personId === p.id ? (
                            <Check className="size-4 shrink-0 text-[#0058cc]" />
                          ) : null}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-1.5 sm:col-span-2">
            <Label>Organization</Label>
            <SimpleSelect
              value={organizationId}
              onChange={setOrganizationId}
              options={lookups.organizations.map((o) => ({ value: o.id, label: o.name }))}
              allowEmpty
              emptyLabel="No organization"
              placeholder="No organization"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Pipeline</Label>
            <SimpleSelect
              value={pipelineId}
              onChange={setPipelineId}
              options={lookups.pipelines.map((p) => ({ value: String(p.id), label: p.name }))}
              placeholder="Pipeline"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Stage</Label>
            <SimpleSelect
              value={stageId}
              onChange={setStageId}
              options={stages.map((s) => ({ value: String(s.id), label: s.name }))}
              placeholder="Stage"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="deal-value">Value</Label>
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
            <Label>Currency</Label>
            <SimpleSelect value={currency} onChange={setCurrency} options={currencyOptions} />
          </div>

          <div className="grid gap-1.5">
            <Label>Source</Label>
            <SimpleSelect
              value={sourceId}
              onChange={setSourceId}
              options={lookups.sources.map((s) => ({ value: String(s.id), label: s.name }))}
              allowEmpty
              emptyLabel="No source"
              placeholder="No source"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="deal-close">Expected close</Label>
            <Input
              id="deal-close"
              type="date"
              value={expectedClose}
              onChange={(e) => setExpectedClose(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5 sm:col-span-2">
            <Label>Owner</Label>
            <OwnerSelect value={owner} onChange={setOwner} />
          </div>

          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="deal-description">Description</Label>
            <Textarea
              id="deal-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this deal about?"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            className={cn("ibl-button-primary")}
            disabled={!valid || isLoading}
            onClick={() => void submit()}
          >
            {isLoading ? <Spinner data-icon="inline-start" /> : null}
            Create deal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
