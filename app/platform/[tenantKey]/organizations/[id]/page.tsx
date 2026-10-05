"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Building2, MoreHorizontal, Plus, Trash2, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ActivityTimeline } from "@/components/crm/activity-timeline";
import { useBreadcrumbs } from "@/components/crm/breadcrumbs";
import { FavoriteButton } from "@/components/crm/favorite-button";
import { HistoryTab } from "@/components/crm/history-tab";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { EmptyState } from "@/components/crm/empty-state";
import { EntityAvatar } from "@/components/crm/entity-avatar";
import { FieldRow, InlineText } from "@/components/crm/inline-field";
import { OwnerSelect } from "@/components/crm/owner-select";
import { TagPicker } from "@/components/crm/tag-picker";
import { useToastApiError } from "@/components/crm/people/crm-error";
import { DealsMiniTable } from "@/components/crm/people/deals-mini-table";
import { PeopleTable } from "@/components/crm/people/people-table";
import { PersonDialog } from "@/components/crm/people/person-dialog";
import { locationLabel } from "@/components/crm/organizations/organizations-table";
import { useSession } from "@/hooks/use-session";
import {
  errorStatus,
  useAttachOrganizationTagMutation,
  useDeleteOrganizationMutation,
  useDetachOrganizationTagMutation,
  useGetOrganizationQuery,
  useListPersonsQuery,
  useUpdateOrganizationMutation,
} from "@/lib/crm/api";
import { formatDateTime, formatRelative } from "@/lib/crm/format";
import type { Address, OrganizationInput } from "@/lib/crm/types";

const CARD =
  "rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]";

/** API address key → its `organizations.address.*` message key. */
const ADDRESS_FIELDS = [
  { key: "street", msg: "street" },
  { key: "city", msg: "city" },
  { key: "state", msg: "state" },
  { key: "postal_code", msg: "postalCode" },
  { key: "country", msg: "country" },
] as const satisfies readonly { key: keyof Address & string; msg: string }[];

/** Organization "show page": the record, its address, its people and deals. */
export default function OrganizationDetailPage() {
  const t = useTranslations("organizations");
  const tc = useTranslations("common");
  const tf = useTranslations("fields");
  const tn = useTranslations("nav");
  const locale = useLocale();
  const toastApiError = useToastApiError();
  const params = useParams<{ id: string }>();
  const id = params?.id ? decodeURIComponent(params.id) : "";
  const router = useRouter();
  const { href } = useSession();

  const { data: organization, isLoading, error } = useGetOrganizationQuery(id, { skip: !id });
  const [updateOrganization] = useUpdateOrganizationMutation();
  const [deleteOrganization, { isLoading: deleting }] = useDeleteOrganizationMutation();
  const [attachTag] = useAttachOrganizationTagMutation();
  const [detachTag] = useDetachOrganizationTagMutation();

  const { data: people, isLoading: loadingPeople } = useListPersonsQuery(
    { organization: id, active: true, page_size: 50 },
    { skip: !id },
  );

  const [addPersonOpen, setAddPersonOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useBreadcrumbs([
    { label: tn("organizations"), href: href("/organizations") },
    { label: organization?.name ?? t("detail.breadcrumb") },
  ]);

  const save = async (body: OrganizationInput) => {
    try {
      await updateOrganization({ id, body }).unwrap();
    } catch (err) {
      toastApiError(err, tf("saveError"));
    }
  };

  /** Address is one JSON column — merge the edited part back into the whole. */
  const saveAddressField = async (key: string, value: string) => {
    const next: Address = { ...organization?.address };
    if (value.trim()) next[key] = value.trim();
    else delete next[key];
    await save({ address: next });
  };

  if (errorStatus(error) === 404) {
    return (
      <div className="flex min-h-0 flex-1 flex-col p-4 md:p-6">
        <EmptyState
          icon={<Building2 strokeWidth={1.75} />}
          title={t("detail.notFound")}
          description={t("detail.notFoundHint")}
          action={
            <Button variant="outline" onClick={() => router.push(href("/organizations"))}>
              <ArrowLeft data-icon="inline-start" strokeWidth={1.75} /> {t("detail.back")}
            </Button>
          }
        />
      </div>
    );
  }

  if (isLoading || !organization) {
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

  const location = locationLabel(organization.address);
  const peopleRows = people?.results ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4">
        {/* ------------------------------------------------------ header */}
        <div className={`${CARD} flex flex-wrap items-start justify-between gap-4 p-4 md:p-5`}>
          <div className="flex min-w-0 items-center gap-4">
            <EntityAvatar
              name={organization.name}
              seed={organization.id}
              kind="organization"
              size="xl"
            />
            <div className="min-w-0">
              <div className="text-lg font-semibold text-gray-900">
                <InlineText
                  value={organization.name}
                  onSave={(v) => (v.trim() ? save({ name: v.trim() }) : undefined)}
                  placeholder={t("detail.unnamed")}
                />
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {location ? `${location} · ` : ""}
                {t("detail.peopleCount", { count: people?.count ?? 0 })}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button className="ibl-button-primary" onClick={() => setAddPersonOpen(true)} />
                }
              >
                <Plus data-icon="inline-start" strokeWidth={1.75} /> {t("detail.addPerson")}
              </TooltipTrigger>
              <TooltipContent side="bottom">{t("detail.addPersonHint")}</TooltipContent>
            </Tooltip>
            <FavoriteButton target={{ organization: organization.id }} />
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
                <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 strokeWidth={1.75} /> {t("detail.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ------------------------------------------- fields + related */}
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
          <section className={`${CARD} p-4`}>
            <h2 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
              {tc("details")}
            </h2>
            <dl className="divide-y divide-gray-100">
              {ADDRESS_FIELDS.map((field) => (
                <FieldRow key={field.key} label={t(`address.${field.msg}`)}>
                  <InlineText
                    value={
                      typeof organization.address?.[field.key] === "string"
                        ? (organization.address[field.key] as string)
                        : ""
                    }
                    onSave={(v) => saveAddressField(field.key, v)}
                    placeholder={t(`address.add.${field.msg}`)}
                  />
                </FieldRow>
              ))}
              <FieldRow label={tc("owner")} hint={t("detail.ownerHint")}>
                <OwnerSelect
                  value={organization.owner}
                  onChange={(owner) => void save({ owner })}
                  size="sm"
                  className="h-8 border-transparent bg-transparent shadow-none hover:bg-gray-50"
                />
              </FieldRow>
              <FieldRow label={tc("tags")} hint={tf("tagsHint")}>
                <TagPicker
                  tags={organization.tags ?? []}
                  onAttach={(tag_id) => attachTag({ id: organization.id, tag_id }).unwrap()}
                  onDetach={(tag_id) => detachTag({ id: organization.id, tag_id }).unwrap()}
                  compact
                />
              </FieldRow>
              <FieldRow label={tc("created")}>
                <span
                  className="text-muted-foreground"
                  title={formatDateTime(organization.created_at, locale)}
                >
                  {formatRelative(organization.created_at, locale)}
                </span>
              </FieldRow>
              <FieldRow label={tc("updated")}>
                <span
                  className="text-muted-foreground"
                  title={formatDateTime(organization.updated_at, locale)}
                >
                  {formatRelative(organization.updated_at, locale)}
                </span>
              </FieldRow>
            </dl>
          </section>

          <section className="min-w-0">
            <Tabs defaultValue="people">
              <TabsList variant="line">
                <TabsTrigger value="people">{tn("people")}</TabsTrigger>
                <TabsTrigger value="deals">{tn("deals")}</TabsTrigger>
                <TabsTrigger value="timeline">{tc("timeline")}</TabsTrigger>
                <TabsTrigger value="history">{tc("history")}</TabsTrigger>
              </TabsList>

              <TabsContent value="people" className="pt-4">
                {!loadingPeople && peopleRows.length === 0 ? (
                  <EmptyState
                    icon={<Users strokeWidth={1.75} />}
                    title={t("detail.noPeople")}
                    description={t("detail.noPeopleHint", { name: organization.name })}
                    action={
                      <Button className="ibl-button-primary" onClick={() => setAddPersonOpen(true)}>
                        <Plus data-icon="inline-start" strokeWidth={1.75} /> {t("detail.addPerson")}
                      </Button>
                    }
                  />
                ) : (
                  <div className={`${CARD} overflow-hidden`}>
                    <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-2">
                      <span className="text-muted-foreground text-xs font-medium">
                        {t("detail.peopleCount", { count: people?.count ?? peopleRows.length })}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => setAddPersonOpen(true)}>
                        <Plus data-icon="inline-start" strokeWidth={1.75} /> {t("detail.addPerson")}
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                      <PeopleTable
                        persons={peopleRows}
                        isLoading={loadingPeople}
                        columns={["job_title"]}
                        skeletonRows={4}
                      />
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="deals" className="pt-4">
                <DealsMiniTable
                  organization={organization.id}
                  emptyDescription={t("detail.noDeals", { name: organization.name })}
                />
              </TabsContent>

              <TabsContent value="timeline" className="pt-4">
                <ActivityTimeline organization={organization.id} />
              </TabsContent>

              <TabsContent value="history" className="pt-4">
                <HistoryTab kind="organization" id={organization.id} />
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </div>

      <PersonDialog
        open={addPersonOpen}
        onOpenChange={setAddPersonOpen}
        defaultOrganization={organization.id}
        navigateOnCreate={false}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("detail.deleteTitle", { name: organization.name })}
        description={t("detail.deleteHint")}
        confirmLabel={t("detail.delete")}
        destructive
        loading={deleting}
        onConfirm={async () => {
          try {
            await deleteOrganization(organization.id).unwrap();
            setConfirmDelete(false);
            toast.success(tc("deletedToast", { name: organization.name }));
            router.push(href("/organizations"));
          } catch (err) {
            toastApiError(err, t("detail.deleteError"));
          }
        }}
      />
    </div>
  );
}
