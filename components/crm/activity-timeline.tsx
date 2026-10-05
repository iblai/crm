"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Check, CalendarClock, Circle, MapPin, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ActivityIcon } from "@/components/crm/activity-icon";
import { InfoTip } from "@/components/crm/info-tip";
import { LoadError } from "@/components/crm/load-error";
import { ActivityTypeBadge } from "@/components/crm/badges";
import { SimpleSelect } from "@/components/crm/simple-select";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { OwnerName } from "@/components/crm/owner-select";
import { useSession } from "@/hooks/use-session";
import {
  errorMessage,
  useCreateActivityMutation,
  useDeleteActivityMutation,
  useListActivitiesQuery,
  useMarkActivityDoneMutation,
  useUpdateActivityMutation,
} from "@/lib/crm/api";
import {
  formatDate,
  formatDateTime,
  formatRelative,
  formatTime,
  scheduleState,
} from "@/lib/crm/format";
import { isAutoStageNote } from "@/lib/crm/activities";
import { useCrmEnums } from "@/lib/crm/i18n";
import type { Activity, ActivityType } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

/**
 * The activity timeline of a person, a deal or an organization: quick-log
 * composer on top, then open work (scheduled, overdue) and the history (done,
 * notes, the DM's own "Stage changed" entries) below. Pass `person` (UUID),
 * `deal` (id) or `organization` (UUID).
 */
export function ActivityTimeline({
  person,
  deal,
  organization,
  showDealLinks = true,
  className,
}: {
  person?: string;
  deal?: number;
  /** An organization's own timeline — activities attached to it directly. */
  organization?: string;
  showDealLinks?: boolean;
  className?: string;
}) {
  const t = useTranslations("activities");
  const tc = useTranslations("common");
  const { data, isLoading, error } = useListActivitiesQuery(
    { person: deal ? undefined : person, deal, organization, page_size: 100 },
    { skip: !person && !deal && !organization },
  );

  const { open, done } = useMemo(() => {
    const rows = [...(data?.results ?? [])];
    const open = rows
      .filter((a) => !a.is_done)
      .sort((a, b) => {
        const as = a.schedule_from ? new Date(a.schedule_from).getTime() : Infinity;
        const bs = b.schedule_from ? new Date(b.schedule_from).getTime() : Infinity;
        return as - bs;
      });
    const done = rows
      .filter((a) => a.is_done)
      .sort(
        (a, b) =>
          new Date(b.done_at ?? b.updated_at).getTime() -
          new Date(a.done_at ?? a.updated_at).getTime(),
      );
    return { open, done };
  }, [data]);

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <ActivityComposer person={person} deal={deal} organization={organization} />

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : null}

      {error ? <LoadError error={error} /> : null}

      {!isLoading && !error && open.length === 0 && done.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed border-gray-200 bg-white p-6 text-center text-sm">
          {t("timeline.empty")}
        </p>
      ) : null}

      {open.length ? (
        <section>
          <h3 className="text-muted-foreground mb-2 flex items-center gap-1 text-xs font-semibold tracking-wide uppercase">
            {tc("open")} · {open.length}
            <InfoTip label={t("timeline.openAbout")}>{t("timeline.openHint")}</InfoTip>
          </h3>
          <ul className="space-y-2">
            {open.map((a) => (
              <ActivityRow
                key={a.id}
                activity={a}
                showDealLink={showDealLinks && !deal}
                showOrganizationLink={!organization}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {done.length ? (
        <section>
          <h3 className="text-muted-foreground mb-2 flex items-center gap-1 text-xs font-semibold tracking-wide uppercase">
            {tc("history")} · {done.length}
            <InfoTip label={t("timeline.historyAbout")}>{t("timeline.historyHint")}</InfoTip>
          </h3>
          <ul className="relative space-y-2 before:absolute before:top-3 before:bottom-3 before:left-[15px] before:w-px before:bg-gray-200">
            {done.map((a) => (
              <ActivityRow
                key={a.id}
                activity={a}
                showDealLink={showDealLinks && !deal}
                showOrganizationLink={!organization}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** One activity — renders an `<li>`; wrap a list of them in a `<ul>`. */
export function ActivityRow({
  activity,
  showDealLink,
  showPersonLink,
  showOrganizationLink,
}: {
  activity: Activity;
  showDealLink?: boolean;
  showPersonLink?: boolean;
  showOrganizationLink?: boolean;
}) {
  const t = useTranslations("activities");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { href } = useSession();
  const [markDone, { isLoading: marking }] = useMarkActivityDoneMutation();
  const [update] = useUpdateActivityMutation();
  const [remove, { isLoading: removing }] = useDeleteActivityMutation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const at = activity.schedule_from;
  // The stage-change note the DM writes itself: read-only.
  const isAutoNote = isAutoStageNote(activity);
  const { kind } = scheduleState(at, !!activity.is_done);
  const scheduleText =
    kind === "unscheduled"
      ? tc("unscheduled")
      : kind === "today"
        ? t("schedule.today", { time: formatTime(at, locale) })
        : kind === "tomorrow"
          ? t("schedule.tomorrow", { time: formatTime(at, locale) })
          : kind === "overdue"
            ? t("schedule.overdue", {
                date: formatDate(at, locale, { month: "short", day: "numeric" }),
              })
            : formatDate(at, locale);

  const toggleDone = async () => {
    try {
      if (activity.is_done) await update({ id: activity.id, body: { is_done: false } }).unwrap();
      else await markDone(activity.id).unwrap();
    } catch (err) {
      toast.error(errorMessage(err, tc("errorGeneric")));
    }
  };

  return (
    <li
      className={cn(
        "relative flex gap-3 rounded-lg border border-[var(--border-color,#e5e7eb)] bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.03)]",
        activity.is_done && "bg-gray-50/60",
      )}
    >
      <ActivityIcon type={activity.type} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={cn(
              "text-sm font-medium text-gray-900",
              activity.is_done && "text-gray-500 line-through decoration-gray-300",
            )}
          >
            {isAutoNote ? t("timeline.stageChanged") : activity.title}
          </span>
          <ActivityTypeBadge type={activity.type} />
          {activity.is_done ? (
            <span className="text-muted-foreground text-[11px]">
              {t("timeline.doneAgo", {
                when: formatRelative(activity.done_at ?? activity.updated_at, locale),
              })}
            </span>
          ) : (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[11px] font-medium",
                kind === "overdue" && "text-rose-600",
                kind === "today" && "text-[#0058cc]",
                kind === "tomorrow" && "text-amber-600",
                (kind === "unscheduled" || kind === "date") && "text-muted-foreground",
              )}
            >
              <CalendarClock className="size-3" /> {scheduleText}
            </span>
          )}
        </div>
        {activity.comment ? (
          <p className="mt-1 text-sm whitespace-pre-wrap text-gray-600">{activity.comment}</p>
        ) : null}
        <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          {activity.location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" /> {activity.location}
            </span>
          ) : null}
          <span>
            <OwnerName ownerId={activity.owner} />
          </span>
          <span title={formatDateTime(activity.created_at, locale)}>
            {t("timeline.loggedAgo", { when: formatRelative(activity.created_at, locale) })}
          </span>
          {showDealLink && activity.deal ? (
            <Link href={href(`/deals/${activity.deal}`)} className="text-[#0058cc] hover:underline">
              {t("timeline.dealLink", { id: activity.deal })}
            </Link>
          ) : null}
          {showPersonLink && activity.person ? (
            <Link
              href={href(`/people/${activity.person}`)}
              className="text-[#0058cc] hover:underline"
            >
              {t("timeline.viewPerson")}
            </Link>
          ) : null}
          {showOrganizationLink && activity.organization ? (
            <Link
              href={href(`/organizations/${activity.organization}`)}
              className="text-[#0058cc] hover:underline"
            >
              {t("timeline.viewOrganization")}
            </Link>
          ) : null}
        </div>
      </div>
      {isAutoNote ? null : (
        <div className="flex shrink-0 items-start gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => void toggleDone()}
                  disabled={marking}
                  aria-label={
                    activity.is_done ? t("timeline.markNotDoneLabel") : t("timeline.markDoneLabel")
                  }
                  className={
                    activity.is_done ? "text-emerald-600" : "text-gray-400 hover:text-emerald-600"
                  }
                />
              }
            >
              {activity.is_done ? <Check /> : <Circle />}
            </TooltipTrigger>
            <TooltipContent>
              {activity.is_done ? t("timeline.markNotDone") : t("timeline.markDone")}
            </TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger
                render={
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon-sm" aria-label={tc("moreActions")} />
                    }
                  />
                }
              >
                <MoreHorizontal />
              </TooltipTrigger>
              <TooltipContent>{t("timeline.moreHint")}</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 /> {tc("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("confirm.deleteTitle")}
        description={t("confirm.deleteDescription", { title: activity.title })}
        confirmLabel={tc("delete")}
        destructive
        loading={removing}
        onConfirm={async () => {
          try {
            await remove(activity.id).unwrap();
            setConfirmDelete(false);
            toast.success(t("toast.deleted"));
          } catch (err) {
            toast.error(errorMessage(err, tc("errorGeneric")));
          }
        }}
      />
    </li>
  );
}

/** Quick-log composer: type · title · optional note, schedule and location. */
export function ActivityComposer({
  person,
  deal,
  organization,
  onCreated,
  defaultType = "note",
}: {
  person?: string;
  deal?: number;
  organization?: string;
  onCreated?: (activity: Activity) => void;
  defaultType?: ActivityType;
}) {
  const t = useTranslations("activities");
  const tc = useTranslations("common");
  const { activityTypeOptions } = useCrmEnums();
  const { userId } = useSession();
  const [create, { isLoading }] = useCreateActivityMutation();
  const [type, setType] = useState<ActivityType>(defaultType);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [scheduleFrom, setScheduleFrom] = useState("");
  const [location, setLocation] = useState("");
  const [reminder, setReminder] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    try {
      const scheduled = scheduleFrom ? new Date(scheduleFrom).toISOString() : null;
      const created = await create({
        title: title.trim(),
        type,
        comment: comment.trim() || undefined,
        person: person ?? undefined,
        deal: deal ?? undefined,
        organization: organization ?? undefined,
        owner: userId ?? undefined,
        schedule_from: scheduled,
        location: location.trim() || undefined,
        reminder_at: reminder && scheduled ? scheduled : undefined,
        is_done: type === "note",
      }).unwrap();
      setTitle("");
      setComment("");
      setScheduleFrom("");
      setLocation("");
      setReminder(false);
      setExpanded(false);
      onCreated?.(created);
      toast.success(type === "note" ? t("toast.noteAdded") : t("toast.logged"));
    } catch (err) {
      toast.error(errorMessage(err, tc("errorGeneric")));
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex flex-wrap items-center gap-2">
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex w-32" />}>
            <SimpleSelect
              value={type}
              onChange={(v) => setType(v as ActivityType)}
              options={activityTypeOptions}
              size="sm"
              className="w-32"
              aria-label={t("typeLabel")}
            />
          </TooltipTrigger>
          <TooltipContent side="bottom">{t("typeHint")}</TooltipContent>
        </Tooltip>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setExpanded(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder={t("composer.placeholder", { type })}
          className="h-8 min-w-40 flex-1 text-sm"
          aria-label={t("composer.titleLabel")}
        />
        <Button
          size="sm"
          className="ibl-button-primary"
          disabled={!title.trim() || isLoading}
          onClick={() => void submit()}
        >
          <Plus data-icon="inline-start" /> {t("composer.add")}
        </Button>
      </div>
      {expanded ? (
        <div className="mt-3 grid gap-3 border-t border-gray-100 pt-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("composer.detailsPlaceholder")}
              rows={2}
              className="text-sm"
              aria-label={tc("details")}
            />
          </div>
          <div className="grid gap-1.5">
            <Label
              htmlFor="activity-schedule"
              className="text-muted-foreground flex items-center gap-1 text-xs"
            >
              {t("composer.when")}
              <InfoTip label={t("composer.whenAbout")}>{t("composer.whenHint")}</InfoTip>
            </Label>
            <Input
              id="activity-schedule"
              type="datetime-local"
              value={scheduleFrom}
              onChange={(e) => setScheduleFrom(e.target.value)}
              className="h-8 text-sm"
              min={format(new Date(2000, 0, 1), "yyyy-MM-dd'T'HH:mm")}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="activity-location" className="text-muted-foreground text-xs">
              {t("location")}
            </Label>
            <Input
              id="activity-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t("locationPlaceholder")}
              className="h-8 text-sm"
            />
          </div>
          <label
            className="text-muted-foreground flex items-center gap-2 text-xs sm:col-span-2"
            title={scheduleFrom ? t("composer.reminderHint") : t("composer.reminderNeedsWhen")}
          >
            <input
              type="checkbox"
              checked={reminder}
              disabled={!scheduleFrom}
              onChange={(e) => setReminder(e.target.checked)}
              className="size-3.5 accent-[#0058cc]"
            />
            {t("composer.remind")}
            {!scheduleFrom ? (
              <span className="text-muted-foreground/70">{t("composer.needsTime")}</span>
            ) : null}
          </label>
        </div>
      ) : null}
    </div>
  );
}
