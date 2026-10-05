"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Link2, Merge, MoreHorizontal, Trash2, UserPlus, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ActivityTimeline } from "@/components/crm/activity-timeline";
import { FavoriteButton } from "@/components/crm/favorite-button";
import { HistoryTab } from "@/components/crm/history-tab";
import { LifecycleBadge } from "@/components/crm/badges";
import { useBreadcrumbs } from "@/components/crm/breadcrumbs";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { EmptyState } from "@/components/crm/empty-state";
import { EntityAvatar } from "@/components/crm/entity-avatar";
import { FieldRow, InlineSelect, InlineText } from "@/components/crm/inline-field";
import { OwnerSelect } from "@/components/crm/owner-select";
import { TagPicker } from "@/components/crm/tag-picker";
import { useToastApiError } from "@/components/crm/people/crm-error";
import { DealsMiniTable } from "@/components/crm/people/deals-mini-table";
import { PersonInviteDialog } from "@/components/crm/people/person-invite-dialog";
import { PersonLinkUserDialog } from "@/components/crm/people/person-link-user-dialog";
import { PersonMergeDialog } from "@/components/crm/people/person-merge-dialog";
import { SearchPicker } from "@/components/crm/search-picker";
import { useSession } from "@/hooks/use-session";
import {
  errorStatus,
  useAttachPersonTagMutation,
  useDeletePersonMutation,
  useDetachPersonTagMutation,
  useGetPersonQuery,
  useGetOrganizationQuery,
  useUpdatePersonMutation,
} from "@/lib/crm/api";
import { formatDateTime, formatRelative } from "@/lib/crm/format";
import { useCrmEnums } from "@/lib/crm/i18n";
import type { LifecycleStage, PersonInput } from "@/lib/crm/types";

const CARD =
  "rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]";

/** Split a comma-separated field back into the API's string array. */
function toList(value: string) {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

/** Person "show page": the record, its fields, its timeline and its deals. */
export default function PersonDetailPage() {
  const t = useTranslations("people");
  const tc = useTranslations("common");
  const tf = useTranslations("fields");
  const tn = useTranslations("nav");
  const locale = useLocale();
  const { lifecycleOptions } = useCrmEnums();
  const toastApiError = useToastApiError();
  const params = useParams<{ id: string }>();
  const id = params?.id ? decodeURIComponent(params.id) : "";
  const router = useRouter();
  const { href } = useSession();

  const { data: person, isLoading, error } = useGetPersonQuery(id, { skip: !id });
  const [updatePerson] = useUpdatePersonMutation();
  const [deletePerson, { isLoading: deleting }] = useDeletePersonMutation();
  const [attachTag] = useAttachPersonTagMutation();
  const [detachTag] = useDetachPersonTagMutation();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useBreadcrumbs([
    { label: tn("people"), href: href("/people") },
    { label: person?.name ?? t("detail.breadcrumb") },
  ]);

  const { data: org } = useGetOrganizationQuery(person?.organization ?? "", {
    skip: !person?.organization,
  });
  const orgName = org?.name;

  const save = async (body: PersonInput) => {
    try {
      await updatePerson({ id, body }).unwrap();
    } catch (err) {
      toastApiError(err, tf("saveError"));
    }
  };

  if (errorStatus(error) === 404) {
    return (
      <div className="flex min-h-0 flex-1 flex-col p-4 md:p-6">
        <EmptyState
          icon={<Users strokeWidth={1.75} />}
          title={t("detail.notFound")}
          description={t("detail.notFoundHint")}
          action={
            <Button variant="outline" onClick={() => router.push(href("/people"))}>
              <ArrowLeft data-icon="inline-start" strokeWidth={1.75} /> {t("detail.back")}
            </Button>
          }
        />
      </div>
    );
  }

  if (isLoading || !person) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4 md:p-6">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  const canInvite = Boolean(person.primary_email) && !person.platform_user;
  const inviteHint = person.platform_user ? t("detail.alreadyLinked") : t("detail.needsEmail");
  const stages = Object.fromEntries(lifecycleOptions.map((o) => [o.value, o.label]));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4">
        {/* ------------------------------------------------------ header */}
        <div className={`${CARD} flex flex-wrap items-start justify-between gap-4 p-4 md:p-5`}>
          <div className="flex min-w-0 items-center gap-4">
            <EntityAvatar name={person.name} seed={person.id} kind="person" size="xl" />
            <div className="min-w-0">
              <div className="text-lg font-semibold text-gray-900">
                <InlineText
                  value={person.name}
                  onSave={(v) => (v.trim() ? save({ name: v.trim() }) : undefined)}
                  placeholder={t("detail.unnamed")}
                />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <InlineSelect
                  value={person.lifecycle_stage ?? "lead"}
                  options={lifecycleOptions}
                  onSave={(v) => save({ lifecycle_stage: (v || "lead") as LifecycleStage })}
                  renderValue={(v) => <LifecycleBadge stage={v as LifecycleStage} />}
                />
                {person.platform_user ? (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span className="inline-flex cursor-default items-center gap-1 rounded-full bg-[#eef6fc] px-2 py-0.5 text-[11px] font-medium text-[#0058cc] ring-1 ring-[#0058cc]/20 ring-inset" />
                      }
                    >
                      <Link2 className="size-3" strokeWidth={1.75} />{" "}
                      {t("detail.linkedUser", { id: String(person.platform_user) })}
                    </TooltipTrigger>
                    <TooltipContent>{t("detail.linkedUserHint")}</TooltipContent>
                  </Tooltip>
                ) : null}
                {!person.active ? (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span className="inline-flex cursor-default items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-gray-500/20 ring-inset" />
                      }
                    >
                      {t("detail.inactive")}
                    </TooltipTrigger>
                    <TooltipContent>{t("detail.inactiveHint")}</TooltipContent>
                  </Tooltip>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {canInvite ? (
              <Tooltip>
                <TooltipTrigger
                  render={<Button variant="outline" onClick={() => setInviteOpen(true)} />}
                >
                  <UserPlus data-icon="inline-start" strokeWidth={1.75} /> {t("detail.invite")}
                </TooltipTrigger>
                <TooltipContent side="bottom">{t("detail.inviteHint")}</TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger
                  render={<Button variant="outline" nativeButton={false} disabled />}
                  aria-label={t("detail.inviteDisabled", { reason: inviteHint })}
                >
                  <UserPlus data-icon="inline-start" strokeWidth={1.75} /> {t("detail.invite")}
                </TooltipTrigger>
                <TooltipContent>{inviteHint}</TooltipContent>
              </Tooltip>
            )}
            <FavoriteButton target={{ person: person.id }} />
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <DropdownMenuTrigger
                      render={
                        <Button variant="outline" size="icon" aria-label={tc("moreActions")} />
                      }
                    />
                  }
                >
                  <MoreHorizontal strokeWidth={1.75} />
                </TooltipTrigger>
                <TooltipContent side="bottom">{t("detail.moreHint")}</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => setLinkOpen(true)}>
                  <Link2 strokeWidth={1.75} /> {t("detail.linkUser")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMergeOpen(true)}>
                  <Merge strokeWidth={1.75} /> {t("detail.merge")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 strokeWidth={1.75} /> {t("detail.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ------------------------------------------- fields + activity */}
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
          <section className={`${CARD} p-4`}>
            <h2 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
              {tc("details")}
            </h2>
            <dl className="divide-y divide-gray-100">
              <FieldRow label={tc("email")}>
                <InlineText
                  value={person.primary_email}
                  type="email"
                  onSave={(v) => save({ primary_email: v.trim() })}
                  placeholder={t("detail.addEmail")}
                  render={(v) => (
                    <a
                      href={`mailto:${v}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[#0058cc] hover:underline"
                    >
                      {v}
                    </a>
                  )}
                />
              </FieldRow>
              <FieldRow label={t("detail.otherEmails")} hint={t("detail.commaSeparated")}>
                <InlineText
                  value={(person.emails ?? []).join(", ")}
                  onSave={(v) => save({ emails: toList(v) })}
                  placeholder={t("detail.addEmails")}
                />
              </FieldRow>
              <FieldRow label={t("detail.phones")} hint={t("detail.commaSeparated")}>
                <InlineText
                  value={(person.contact_numbers ?? []).join(", ")}
                  onSave={(v) => save({ contact_numbers: toList(v) })}
                  placeholder={t("detail.addPhones")}
                />
              </FieldRow>
              <FieldRow label={t("fields.jobTitle")}>
                <InlineText
                  value={person.job_title}
                  onSave={(v) => save({ job_title: v.trim() })}
                  placeholder={t("detail.addJobTitle")}
                />
              </FieldRow>
              <FieldRow label={t("fields.organization")}>
                <div className="min-w-0">
                  <SearchPicker
                    kind="organization"
                    value={person.organization}
                    onChange={(id) => void save({ organization: id })}
                    placeholder={t("fields.noOrganization")}
                    size="sm"
                    className="h-8 border-transparent bg-transparent shadow-none hover:bg-gray-50"
                  />
                  {person.organization ? (
                    <Link
                      href={href(`/organizations/${person.organization}`)}
                      className="mt-0.5 ml-1.5 inline-block text-xs text-[#0058cc] hover:underline"
                    >
                      {orgName
                        ? t("detail.openOrganizationNamed", { name: orgName })
                        : t("detail.openOrganization")}
                    </Link>
                  ) : null}
                </div>
              </FieldRow>
              <FieldRow label={tc("owner")} hint={t("detail.ownerHint")}>
                <OwnerSelect
                  value={person.owner}
                  onChange={(owner) => void save({ owner })}
                  size="sm"
                  className="h-8 border-transparent bg-transparent shadow-none hover:bg-gray-50"
                />
              </FieldRow>
              <FieldRow label={t("fields.lifecycle")} hint={t("detail.lifecycleHint", stages)}>
                <InlineSelect
                  value={person.lifecycle_stage ?? "lead"}
                  options={lifecycleOptions}
                  onSave={(v) => save({ lifecycle_stage: (v || "lead") as LifecycleStage })}
                />
              </FieldRow>
              <FieldRow label={t("detail.externalId")} hint={t("detail.externalIdHint")}>
                <InlineText
                  value={person.unique_id}
                  onSave={(v) => save({ unique_id: v.trim() })}
                  placeholder={t("detail.addExternalId")}
                />
              </FieldRow>
              <FieldRow label={tc("tags")} hint={tf("tagsHint")}>
                <TagPicker
                  tags={person.tags ?? []}
                  onAttach={(tag_id) => attachTag({ id: person.id, tag_id }).unwrap()}
                  onDetach={(tag_id) => detachTag({ id: person.id, tag_id }).unwrap()}
                  compact
                />
              </FieldRow>
              <FieldRow label={tc("created")}>
                <span
                  className="text-muted-foreground"
                  title={formatDateTime(person.created_at, locale)}
                >
                  {formatRelative(person.created_at, locale)}
                </span>
              </FieldRow>
              <FieldRow label={tc("updated")}>
                <span
                  className="text-muted-foreground"
                  title={formatDateTime(person.updated_at, locale)}
                >
                  {formatRelative(person.updated_at, locale)}
                </span>
              </FieldRow>
            </dl>
          </section>

          <section className="min-w-0">
            <Tabs defaultValue="timeline">
              <TabsList variant="line">
                <TabsTrigger value="timeline">{tc("timeline")}</TabsTrigger>
                <TabsTrigger value="deals">{tn("deals")}</TabsTrigger>
                <TabsTrigger value="history">{tc("history")}</TabsTrigger>
              </TabsList>
              <TabsContent value="timeline" className="pt-4">
                <ActivityTimeline person={person.id} />
              </TabsContent>
              <TabsContent value="deals" className="pt-4">
                <DealsMiniTable
                  person={person.id}
                  emptyDescription={t("detail.noDeals", { name: person.name })}
                />
              </TabsContent>
              <TabsContent value="history" className="pt-4">
                <HistoryTab kind="person" id={person.id} />
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </div>

      <PersonInviteDialog open={inviteOpen} onOpenChange={setInviteOpen} person={person} />
      <PersonLinkUserDialog open={linkOpen} onOpenChange={setLinkOpen} person={person} />
      <PersonMergeDialog open={mergeOpen} onOpenChange={setMergeOpen} person={person} />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("detail.deleteTitle", { name: person.name })}
        description={t("detail.deleteHint")}
        confirmLabel={t("detail.delete")}
        destructive
        loading={deleting}
        onConfirm={async () => {
          try {
            await deletePerson(person.id).unwrap();
            setConfirmDelete(false);
            toast.success(tc("deletedToast", { name: person.name }));
            router.push(href("/people"));
          } catch (err) {
            toastApiError(err, t("detail.deleteError"));
          }
        }}
      />
    </div>
  );
}
