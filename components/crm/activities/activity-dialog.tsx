"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Briefcase, Building2, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@iblai/iblai-js/web-containers";
import { InfoTip } from "@/components/crm/info-tip";
import { SearchPicker } from "@/components/crm/search-picker";
import { SimpleSelect } from "@/components/crm/simple-select";
import { OwnerSelect } from "@/components/crm/owner-select";
import { useSession } from "@/hooks/use-session";
import {
  errorMessage,
  errorStatus,
  useCreateActivityMutation,
  useGetDealQuery,
  useListDealsQuery,
  useUpdateActivityMutation,
} from "@/lib/crm/api";
import { useCrmEnums } from "@/lib/crm/i18n";
import type { Activity, ActivityType } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

const LOCAL_PATTERN = "yyyy-MM-dd'T'HH:mm";

/** ISO timestamp → the value a `datetime-local` input expects (local time). */
export function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : format(d, LOCAL_PATTERN);
}

/** `datetime-local` value → ISO timestamp (or null when empty / invalid). */
export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

interface DraftState {
  type: ActivityType;
  title: string;
  person: string;
  deal: string;
  organization: string;
  scheduleFrom: string;
  scheduleTo: string;
  location: string;
  comment: string;
  reminder: boolean;
  owner: number | null;
  isDone: boolean;
}

function draftFrom(activity: Activity | undefined, userId: number | null): DraftState {
  return {
    type: activity?.type ?? "task",
    title: activity?.title ?? "",
    person: activity?.person ?? "",
    deal: activity?.deal ? String(activity.deal) : "",
    organization: activity?.organization ?? "",
    scheduleFrom: toLocalInput(activity?.schedule_from),
    scheduleTo: toLocalInput(activity?.schedule_to),
    location: activity?.location ?? "",
    comment: activity?.comment ?? "",
    reminder: !!activity?.reminder_at,
    owner: activity ? (activity.owner ?? null) : userId,
    isDone: !!activity?.is_done,
  };
}

/**
 * Create or edit an activity. The API requires an activity to hang off a
 * person, a deal or an organization, so at least one must be picked — the
 * form says so rather than letting the request fail.
 */
export function ActivityDialog({
  open,
  onOpenChange,
  activity,
  defaultPerson,
  defaultDeal,
  defaultOrganization,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Editing an existing activity; omit to create one. */
  activity?: Activity;
  defaultPerson?: string;
  defaultDeal?: number;
  defaultOrganization?: string;
  onSaved?: (activity: Activity) => void;
}) {
  const t = useTranslations("activities");
  const tc = useTranslations("common");
  const { activityTypeOptions } = useCrmEnums();
  const { userId } = useSession();
  const [create, { isLoading: creating }] = useCreateActivityMutation();
  const [update, { isLoading: updating }] = useUpdateActivityMutation();
  const saving = creating || updating;

  const [draft, setDraft] = useState<DraftState>(() => draftFrom(activity, userId));
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    const base = draftFrom(activity, userId);
    setDraft({
      ...base,
      person: base.person || defaultPerson || "",
      deal: base.deal || (defaultDeal ? String(defaultDeal) : ""),
      organization: base.organization || defaultOrganization || "",
    });
    setTouched(false);
  }, [open, activity, userId, defaultPerson, defaultDeal, defaultOrganization]);

  const { currentData: deals } = useListDealsQuery(
    { page_size: 100, status: "open", person: draft.person || undefined },
    { skip: !open },
  );

  // The picked deal itself: the open list above holds one person's deals only.
  const { currentData: pickedDeal } = useGetDealQuery(Number(draft.deal), {
    skip: !open || !draft.deal,
  });

  const dealOptions = useMemo(() => {
    const options = (deals?.results ?? []).map((d) => ({ value: String(d.id), label: d.title }));
    if (pickedDeal && !options.some((o) => o.value === String(pickedDeal.id))) {
      options.unshift({ value: String(pickedDeal.id), label: pickedDeal.title });
    }
    return options;
  }, [deals, pickedDeal]);

  const set = <K extends keyof DraftState>(key: K, value: DraftState[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const titleMissing = !draft.title.trim();
  const linkMissing = !draft.person && !draft.deal && !draft.organization;
  // The DM refuses a deal whose person is not the chosen person.
  const dealMismatch = !!pickedDeal && !!draft.person && pickedDeal.person !== draft.person;
  const invalid = titleMissing || linkMissing || dealMismatch;

  const submit = async () => {
    setTouched(true);
    if (invalid) return;
    const scheduleFrom = fromLocalInput(draft.scheduleFrom);
    const body = {
      type: draft.type,
      title: draft.title.trim(),
      person: draft.person || null,
      deal: draft.deal ? Number(draft.deal) : null,
      organization: draft.organization || null,
      schedule_from: scheduleFrom,
      schedule_to: fromLocalInput(draft.scheduleTo),
      location: draft.location.trim(),
      comment: draft.comment.trim(),
      reminder_at: draft.reminder && scheduleFrom ? scheduleFrom : null,
      owner: draft.owner,
      is_done: draft.isDone,
    };
    try {
      const saved = activity
        ? await update({ id: activity.id, body }).unwrap()
        : await create(body).unwrap();
      toast.success(activity ? t("toast.updated") : t("toast.created"));
      onSaved?.(saved);
      onOpenChange(false);
    } catch (err) {
      toast.error(
        errorStatus(err) === 403 ? tc("errorForbidden") : errorMessage(err, tc("errorGeneric")),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <DialogHeader className="p-4 pb-3">
          <DialogTitle>{activity ? t("dialog.editTitle") : t("newActivity")}</DialogTitle>
          <DialogDescription>{t("dialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3.5 px-4 pb-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label
              htmlFor="activity-type"
              className="text-muted-foreground flex items-center gap-1 text-xs"
            >
              {t("dialog.type")}
              <InfoTip label={t("dialog.typeAbout")}>{t("typeHint")}</InfoTip>
            </Label>
            <SimpleSelect
              value={draft.type}
              onChange={(v) => set("type", v as ActivityType)}
              options={activityTypeOptions}
              size="sm"
              aria-label={t("typeLabel")}
            />
          </div>

          <div className="grid gap-1.5">
            <Label
              htmlFor="activity-owner"
              className="text-muted-foreground flex items-center gap-1 text-xs"
            >
              {tc("owner")}
              <InfoTip label={t("dialog.ownerAbout")}>{t("dialog.ownerHint")}</InfoTip>
            </Label>
            <OwnerSelect value={draft.owner} onChange={(v) => set("owner", v)} size="sm" />
          </div>

          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="activity-title" className="text-muted-foreground text-xs">
              {t("dialog.titleLabel")}
            </Label>
            <Input
              id="activity-title"
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder={t("dialog.titlePlaceholder")}
              className="h-8 text-sm"
              aria-invalid={touched && titleMissing}
            />
            {touched && titleMissing ? (
              <p className="text-xs text-rose-600">{t("dialog.titleRequired")}</p>
            ) : null}
          </div>

          <div className="grid gap-1.5">
            <Label className="text-muted-foreground text-xs">
              <UserRound className="size-3" /> {t("dialog.person")}
            </Label>
            <SearchPicker
              kind="person"
              value={draft.person || null}
              onChange={(id) => {
                const person = id ?? "";
                // A deal of someone else cannot stay picked.
                const keep = !person || !pickedDeal || pickedDeal.person === person;
                setDraft((d) => ({ ...d, person, deal: keep ? d.deal : "" }));
              }}
              placeholder={t("dialog.noPerson")}
              size="sm"
              className="h-8"
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-muted-foreground text-xs">
              <Briefcase className="size-3" /> {t("dialog.deal")}
            </Label>
            <SimpleSelect
              value={draft.deal}
              onChange={(v) => set("deal", v)}
              options={dealOptions}
              allowEmpty
              emptyLabel={t("dialog.noDeal")}
              placeholder={t("dialog.noDeal")}
              size="sm"
              aria-label={t("dialog.deal")}
            />
            {dealMismatch ? (
              <p className="text-xs text-rose-600">{t("dialog.dealMismatch")}</p>
            ) : null}
          </div>

          <div className="grid gap-1.5">
            <Label className="text-muted-foreground text-xs">
              <Building2 className="size-3" /> {t("dialog.organization")}
            </Label>
            <SearchPicker
              kind="organization"
              value={draft.organization || null}
              onChange={(id) => set("organization", id ?? "")}
              placeholder={t("dialog.noOrganization")}
              size="sm"
              className="h-8"
            />
          </div>

          {touched && linkMissing ? (
            <p className="-mt-1 text-xs text-rose-600 sm:col-span-2">{t("dialog.linkRequired")}</p>
          ) : (
            <p className="text-muted-foreground -mt-1 text-[11px] sm:col-span-2">
              {t("dialog.linkHint")}
            </p>
          )}

          <div className="grid gap-1.5">
            <Label
              htmlFor="activity-from"
              className="text-muted-foreground flex items-center gap-1 text-xs"
            >
              {t("dialog.starts")}
              <InfoTip label={t("dialog.startsAbout")}>{t("dialog.startsHint")}</InfoTip>
            </Label>
            <Input
              id="activity-from"
              type="datetime-local"
              value={draft.scheduleFrom}
              onChange={(e) => set("scheduleFrom", e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="activity-to" className="text-muted-foreground text-xs">
              {t("dialog.ends")}
            </Label>
            <Input
              id="activity-to"
              type="datetime-local"
              value={draft.scheduleTo}
              min={draft.scheduleFrom || undefined}
              onChange={(e) => set("scheduleTo", e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="activity-location" className="text-muted-foreground text-xs">
              {t("location")}
            </Label>
            <Input
              id="activity-location"
              value={draft.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder={t("locationPlaceholder")}
              className="h-8 text-sm"
            />
          </div>

          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="activity-comment" className="text-muted-foreground text-xs">
              {tc("details")}
            </Label>
            <Textarea
              id="activity-comment"
              value={draft.comment}
              onChange={(e) => set("comment", e.target.value)}
              rows={3}
              placeholder={t("dialog.detailsPlaceholder")}
              className="text-sm"
            />
          </div>

          <div
            className={cn(
              "flex items-center justify-between gap-3 rounded-lg border border-[var(--border-color,#e5e7eb)] px-3 py-2 sm:col-span-2",
              !draft.scheduleFrom && "opacity-60",
            )}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{t("dialog.remind")}</p>
              <p className="text-muted-foreground text-[11px]">
                {draft.scheduleFrom ? t("dialog.remindOn") : t("dialog.remindOff")}
              </p>
            </div>
            <Switch
              checked={draft.reminder && !!draft.scheduleFrom}
              disabled={!draft.scheduleFrom}
              onCheckedChange={(checked) => set("reminder", checked)}
              aria-label={t("dialog.remind")}
            />
          </div>

          <div className="flex items-center gap-2 sm:col-span-2">
            <Checkbox
              id="activity-done"
              checked={draft.isDone}
              onCheckedChange={(checked) => set("isDone", checked === true)}
            />
            <Label htmlFor="activity-done" className="text-sm text-gray-700">
              {t("dialog.alreadyDone")}
            </Label>
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 rounded-b-xl">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {tc("cancel")}
          </Button>
          <Button className="ibl-button-primary" onClick={() => void submit()} disabled={saving}>
            {saving ? <Spinner size="sm" className="size-4 text-current" /> : null}
            {activity ? t("dialog.saveChanges") : t("dialog.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
