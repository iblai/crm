/**
 * RTK Query slice for the ibl.ai CRM API (`/dm/api/crm/…`).
 *
 * Every request carries the signed-in user's DM session token
 * (`Authorization: Token <dm_token>`), exactly like the OS talks to the Data
 * Manager. The Platform (organization) is inferred from the token — there is
 * no `?platform_key=`. Switching organizations is a full navigation, which
 * rebuilds this store; a tab left on another organization's URL is caught in
 * `baseQuery` before this slice sends that token anywhere (the SDK's own
 * requests are not covered).
 */
import { createApi, fetchBaseQuery, type FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import config from "@/lib/iblai/config";
import { LOCAL_STORAGE_KEYS } from "@/lib/iblai/auth-utils";
import { readCurrentTenantKey, tenantMismatch } from "@/lib/iblai/tenant";
import { detailFromBody } from "./errors";
import type {
  Activity,
  ActivityInput,
  ActivityListParams,
  CrmApiError,
  Deal,
  DealBoard,
  DealBoardParams,
  DealInput,
  DealListParams,
  Favorite,
  FavoriteInput,
  HistoryEntry,
  LeadSource,
  LeadSourceInput,
  LeadSourceListParams,
  Organization,
  OrganizationInput,
  OrganizationListParams,
  Overview,
  OverviewParams,
  Paginated,
  Person,
  PersonInput,
  PersonInviteRequest,
  PersonInviteResponse,
  PersonListParams,
  PersonMergeRequest,
  PersonMergeResponse,
  Pipeline,
  PipelineInput,
  PipelineListParams,
  PipelineStage,
  PipelineStageInput,
  SavedView,
  SavedViewInput,
  SavedViewObject,
  SearchResponse,
  Tag,
  TagAttachResponse,
  TagInput,
  TagListParams,
} from "./types";

export const CRM_TAG_TYPES = [
  "Person",
  "Organization",
  "Pipeline",
  "LeadSource",
  "Deal",
  "Activity",
  "Tag",
  "Favorite",
  "SavedView",
  "Overview",
  "Board",
  "History",
] as const;

type TagType = (typeof CRM_TAG_TYPES)[number];

const LIST = "LIST";

function listTags<T extends { id: string | number }>(type: TagType, results?: T[]) {
  return [{ type, id: LIST }, ...(results ?? []).map((r) => ({ type, id: r.id }))];
}

/** Strip undefined / empty params so the URL only carries real filters. */
function cleanParams<T extends object>(params?: T) {
  if (!params) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v as string | number | boolean;
  }
  return out;
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${config.dmUrl()}/api/crm`,
  prepareHeaders: (headers) => {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(LOCAL_STORAGE_KEYS.DM_TOKEN)
        : null;
    if (token) headers.set("Authorization", `Token ${token}`);
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    return headers;
  },
});

/** Normalize errors to `{ status, detail }` so the UI can toast them. */
const baseQuery: typeof rawBaseQuery = async (args, api, extra) => {
  // A stale tab: the URL names one organization, the session holds another's
  // token. Never send it — follow the session, as a tenant mismatch does.
  if (
    typeof window !== "undefined" &&
    tenantMismatch(window.location.pathname, readCurrentTenantKey())
  ) {
    window.location.href = "/";
    // No detail: the caller's translated fallback shows while the navigation lands.
    const error: FetchBaseQueryError = { status: "CUSTOM_ERROR", error: "" };
    return { error };
  }
  const result = await rawBaseQuery(args, api, extra);
  if (result.error) {
    const data = result.error.data as unknown;
    const detail = detailFromBody(data);
    const status = result.error.status;
    if (status === 401 && typeof window !== "undefined") {
      // Session expired: the SDK's 401 handler signs the user in again.
      import("@/lib/iblai/auth-utils").then(({ redirectToAuthSpa }) =>
        redirectToAuthSpa(undefined, undefined, true),
      );
    }
    const normalized: CrmApiError = { status, detail, data };
    return { error: normalized as unknown as typeof result.error };
  }
  return result;
};

export const crmApi = createApi({
  reducerPath: "crmApi",
  baseQuery,
  tagTypes: CRM_TAG_TYPES,
  keepUnusedDataFor: 60,
  endpoints: (builder) => ({
    // ------------------------------------------------------------- Persons
    listPersons: builder.query<Paginated<Person>, PersonListParams | void>({
      query: (params) => ({ url: "/persons/", params: cleanParams(params ?? undefined) }),
      providesTags: (res) => listTags("Person", res?.results),
    }),
    getPerson: builder.query<Person, string>({
      query: (id) => `/persons/${id}/`,
      providesTags: (_r, _e, id) => [{ type: "Person", id }],
    }),
    createPerson: builder.mutation<Person, PersonInput>({
      query: (body) => ({ url: "/persons/", method: "POST", body }),
      invalidatesTags: [{ type: "Person", id: LIST }, "Overview"],
    }),
    updatePerson: builder.mutation<Person, { id: string; body: PersonInput }>({
      query: ({ id, body }) => ({ url: `/persons/${id}/`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Person", id },
        { type: "Person", id: LIST },
        { type: "Deal", id: LIST },
        { type: "Favorite", id: LIST },
        { type: "History", id: `person-${id}` },
        "Board",
      ],
    }),
    deletePerson: builder.mutation<void, string>({
      query: (id) => ({ url: `/persons/${id}/`, method: "DELETE" }),
      invalidatesTags: [
        { type: "Person", id: LIST },
        { type: "Deal", id: LIST },
        { type: "Activity", id: LIST },
        { type: "Favorite", id: LIST },
        "Board",
        "Overview",
      ],
    }),
    invitePerson: builder.mutation<
      PersonInviteResponse,
      { id: string; body?: PersonInviteRequest }
    >({
      query: ({ id, body }) => ({
        url: `/persons/${id}/invite/`,
        method: "POST",
        body: body ?? {},
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Person", id }],
    }),
    linkPersonUser: builder.mutation<Person, { id: string; user_id: number }>({
      query: ({ id, user_id }) => ({
        url: `/persons/${id}/link-user/`,
        method: "POST",
        body: { user_id },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Person", id },
        { type: "Person", id: LIST },
        { type: "History", id: `person-${id}` },
        "Overview",
      ],
    }),
    mergePersons: builder.mutation<PersonMergeResponse, PersonMergeRequest>({
      query: (body) => ({ url: "/persons/merge/", method: "POST", body }),
      invalidatesTags: (_r, _e, { primary_id }) => [
        { type: "Person", id: primary_id },
        { type: "Person", id: LIST },
        { type: "Deal", id: LIST },
        { type: "Activity", id: LIST },
        { type: "Favorite", id: LIST },
        "Board",
        "Overview",
      ],
    }),
    attachPersonTag: builder.mutation<TagAttachResponse, { id: string; tag_id: number }>({
      query: ({ id, tag_id }) => ({
        url: `/persons/${id}/tags/`,
        method: "POST",
        body: { tag_id },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Person", id },
        { type: "Person", id: LIST },
      ],
    }),
    detachPersonTag: builder.mutation<void, { id: string; tag_id: number }>({
      query: ({ id, tag_id }) => ({ url: `/persons/${id}/tags/${tag_id}/`, method: "DELETE" }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Person", id },
        { type: "Person", id: LIST },
      ],
    }),
    personHistory: builder.query<HistoryEntry[], string>({
      query: (id) => `/persons/${id}/history/`,
      providesTags: (_r, _e, id) => [{ type: "History", id: `person-${id}` }],
    }),

    // --------------------------------------------------------------- Search
    search: builder.query<SearchResponse, { q: string; limit?: number }>({
      query: (params) => ({ url: "/search/", params: cleanParams(params) }),
      providesTags: [
        { type: "Person", id: LIST },
        { type: "Organization", id: LIST },
        { type: "Deal", id: LIST },
      ],
    }),

    // ------------------------------------------------------------- Overview
    overview: builder.query<Overview, OverviewParams | void>({
      query: (params) => ({ url: "/overview/", params: cleanParams(params ?? undefined) }),
      providesTags: ["Overview"],
    }),

    // ------------------------------------------------------- Organizations
    listOrganizations: builder.query<Paginated<Organization>, OrganizationListParams | void>({
      query: (params) => ({ url: "/organizations/", params: cleanParams(params ?? undefined) }),
      providesTags: (res) => listTags("Organization", res?.results),
    }),
    getOrganization: builder.query<Organization, string>({
      query: (id) => `/organizations/${id}/`,
      providesTags: (_r, _e, id) => [{ type: "Organization", id }],
    }),
    createOrganization: builder.mutation<Organization, OrganizationInput>({
      query: (body) => ({ url: "/organizations/", method: "POST", body }),
      invalidatesTags: [{ type: "Organization", id: LIST }, "Overview"],
    }),
    updateOrganization: builder.mutation<Organization, { id: string; body: OrganizationInput }>({
      query: ({ id, body }) => ({ url: `/organizations/${id}/`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Organization", id },
        { type: "Organization", id: LIST },
        { type: "Person", id: LIST },
        { type: "Deal", id: LIST },
        { type: "Favorite", id: LIST },
        { type: "History", id: `organization-${id}` },
        "Board",
      ],
    }),
    deleteOrganization: builder.mutation<void, string>({
      query: (id) => ({ url: `/organizations/${id}/`, method: "DELETE" }),
      invalidatesTags: [
        { type: "Organization", id: LIST },
        { type: "Person", id: LIST },
        { type: "Deal", id: LIST },
        { type: "Activity", id: LIST },
        { type: "Favorite", id: LIST },
        "Board",
        "Overview",
      ],
    }),
    attachOrganizationTag: builder.mutation<TagAttachResponse, { id: string; tag_id: number }>({
      query: ({ id, tag_id }) => ({
        url: `/organizations/${id}/tags/`,
        method: "POST",
        body: { tag_id },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Organization", id },
        { type: "Organization", id: LIST },
      ],
    }),
    detachOrganizationTag: builder.mutation<void, { id: string; tag_id: number }>({
      query: ({ id, tag_id }) => ({
        url: `/organizations/${id}/tags/${tag_id}/`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Organization", id },
        { type: "Organization", id: LIST },
      ],
    }),
    organizationHistory: builder.query<HistoryEntry[], string>({
      query: (id) => `/organizations/${id}/history/`,
      providesTags: (_r, _e, id) => [{ type: "History", id: `organization-${id}` }],
    }),

    // ----------------------------------------------------------- Pipelines
    listPipelines: builder.query<Paginated<Pipeline>, PipelineListParams | void>({
      query: (params) => ({ url: "/pipelines/", params: cleanParams(params ?? undefined) }),
      providesTags: (res) => listTags("Pipeline", res?.results),
    }),
    getPipeline: builder.query<Pipeline, number>({
      query: (id) => `/pipelines/${id}/`,
      providesTags: (_r, _e, id) => [{ type: "Pipeline", id }],
    }),
    createPipeline: builder.mutation<Pipeline, PipelineInput>({
      query: (body) => ({ url: "/pipelines/", method: "POST", body }),
      invalidatesTags: [{ type: "Pipeline", id: LIST }, "Board", "Overview"],
    }),
    updatePipeline: builder.mutation<Pipeline, { id: number; body: PipelineInput }>({
      query: ({ id, body }) => ({ url: `/pipelines/${id}/`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Pipeline", id },
        { type: "Pipeline", id: LIST },
        "Board",
        "Overview",
      ],
    }),
    deletePipeline: builder.mutation<void, number>({
      query: (id) => ({ url: `/pipelines/${id}/`, method: "DELETE" }),
      invalidatesTags: [{ type: "Pipeline", id: LIST }, "Board", "Overview"],
    }),
    listStages: builder.query<Paginated<PipelineStage>, { pipeline: number; page_size?: number }>({
      query: ({ pipeline, ...params }) => ({
        url: `/pipelines/${pipeline}/stages/`,
        params: cleanParams({ page_size: 100, ...params }),
      }),
      providesTags: (_r, _e, { pipeline }) => [{ type: "Pipeline", id: pipeline }],
    }),
    createStage: builder.mutation<PipelineStage, { pipeline: number; body: PipelineStageInput }>({
      query: ({ pipeline, body }) => ({
        url: `/pipelines/${pipeline}/stages/`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { pipeline }) => [
        { type: "Pipeline", id: pipeline },
        { type: "Pipeline", id: LIST },
        "Board",
        "Overview",
      ],
    }),
    updateStage: builder.mutation<
      PipelineStage,
      { pipeline: number; id: number; body: PipelineStageInput }
    >({
      query: ({ pipeline, id, body }) => ({
        url: `/pipelines/${pipeline}/stages/${id}/`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { pipeline }) => [
        { type: "Pipeline", id: pipeline },
        { type: "Pipeline", id: LIST },
        "Board",
        "Overview",
      ],
    }),
    deleteStage: builder.mutation<void, { pipeline: number; id: number }>({
      query: ({ pipeline, id }) => ({
        url: `/pipelines/${pipeline}/stages/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { pipeline }) => [
        { type: "Pipeline", id: pipeline },
        { type: "Pipeline", id: LIST },
        "Board",
        "Overview",
      ],
    }),
    reorderStages: builder.mutation<Pipeline, { pipeline: number; order: number[] }>({
      query: ({ pipeline, order }) => ({
        url: `/pipelines/${pipeline}/stages/reorder/`,
        method: "POST",
        body: { order },
      }),
      invalidatesTags: (_r, _e, { pipeline }) => [
        { type: "Pipeline", id: pipeline },
        { type: "Pipeline", id: LIST },
        "Board",
        "Overview",
      ],
    }),

    // -------------------------------------------------------- Lead sources
    listLeadSources: builder.query<Paginated<LeadSource>, LeadSourceListParams | void>({
      query: (params) => ({
        url: "/lead-sources/",
        params: cleanParams({ page_size: 100, ...params }),
      }),
      providesTags: (res) => listTags("LeadSource", res?.results),
    }),
    createLeadSource: builder.mutation<LeadSource, LeadSourceInput>({
      query: (body) => ({ url: "/lead-sources/", method: "POST", body }),
      invalidatesTags: [{ type: "LeadSource", id: LIST }],
    }),
    updateLeadSource: builder.mutation<LeadSource, { id: number; body: LeadSourceInput }>({
      query: ({ id, body }) => ({ url: `/lead-sources/${id}/`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "LeadSource", id },
        { type: "LeadSource", id: LIST },
      ],
    }),
    deleteLeadSource: builder.mutation<void, number>({
      query: (id) => ({ url: `/lead-sources/${id}/`, method: "DELETE" }),
      invalidatesTags: [{ type: "LeadSource", id: LIST }],
    }),

    // --------------------------------------------------------------- Deals
    listDeals: builder.query<Paginated<Deal>, DealListParams | void>({
      query: (params) => ({ url: "/deals/", params: cleanParams(params ?? undefined) }),
      providesTags: (res) => listTags("Deal", res?.results),
    }),
    /** One pipeline's deals grouped by stage, with per-stage totals (the kanban). */
    dealBoard: builder.query<DealBoard, DealBoardParams | void>({
      query: (params) => ({ url: "/deals/board/", params: cleanParams(params ?? undefined) }),
      providesTags: ["Board"],
    }),
    dealHistory: builder.query<HistoryEntry[], number>({
      query: (id) => `/deals/${id}/history/`,
      providesTags: (_r, _e, id) => [{ type: "History", id: `deal-${id}` }],
    }),
    getDeal: builder.query<Deal, number>({
      query: (id) => `/deals/${id}/`,
      providesTags: (_r, _e, id) => [{ type: "Deal", id }],
    }),
    createDeal: builder.mutation<Deal, DealInput>({
      query: (body) => ({ url: "/deals/", method: "POST", body }),
      invalidatesTags: [
        { type: "Deal", id: LIST },
        { type: "Activity", id: LIST },
        "Board",
        "Overview",
      ],
    }),
    updateDeal: builder.mutation<Deal, { id: number; body: DealInput }>({
      query: ({ id, body }) => ({ url: `/deals/${id}/`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Deal", id },
        { type: "Deal", id: LIST },
        { type: "Favorite", id: LIST },
        { type: "History", id: `deal-${id}` },
        "Board",
        "Overview",
      ],
    }),
    deleteDeal: builder.mutation<void, number>({
      query: (id) => ({ url: `/deals/${id}/`, method: "DELETE" }),
      invalidatesTags: [
        { type: "Deal", id: LIST },
        { type: "Activity", id: LIST },
        { type: "Favorite", id: LIST },
        "Board",
        "Overview",
      ],
    }),
    moveDealStage: builder.mutation<Deal, { id: number; stage_id?: number; stage_code?: string }>({
      query: ({ id, ...body }) => ({ url: `/deals/${id}/move-stage/`, method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Deal", id },
        { type: "Deal", id: LIST },
        { type: "Activity", id: LIST },
        { type: "History", id: `deal-${id}` },
        "Board",
        "Overview",
      ],
    }),
    markDealWon: builder.mutation<Deal, { id: number; stage_code?: string }>({
      query: ({ id, ...body }) => ({ url: `/deals/${id}/won/`, method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Deal", id },
        { type: "Deal", id: LIST },
        { type: "Activity", id: LIST },
        { type: "History", id: `deal-${id}` },
        "Board",
        "Overview",
      ],
    }),
    markDealLost: builder.mutation<Deal, { id: number; lost_reason: string; stage_code?: string }>({
      query: ({ id, ...body }) => ({ url: `/deals/${id}/lost/`, method: "POST", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Deal", id },
        { type: "Deal", id: LIST },
        { type: "Activity", id: LIST },
        { type: "History", id: `deal-${id}` },
        "Board",
        "Overview",
      ],
    }),
    attachDealTag: builder.mutation<TagAttachResponse, { id: number; tag_id: number }>({
      query: ({ id, tag_id }) => ({ url: `/deals/${id}/tags/`, method: "POST", body: { tag_id } }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Deal", id },
        { type: "Deal", id: LIST },
        "Board",
      ],
    }),
    detachDealTag: builder.mutation<void, { id: number; tag_id: number }>({
      query: ({ id, tag_id }) => ({ url: `/deals/${id}/tags/${tag_id}/`, method: "DELETE" }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Deal", id },
        { type: "Deal", id: LIST },
        "Board",
      ],
    }),

    // ---------------------------------------------------------- Activities
    listActivities: builder.query<Paginated<Activity>, ActivityListParams | void>({
      query: (params) => ({ url: "/activities/", params: cleanParams(params ?? undefined) }),
      providesTags: (res) => listTags("Activity", res?.results),
    }),
    getActivity: builder.query<Activity, number>({
      query: (id) => `/activities/${id}/`,
      providesTags: (_r, _e, id) => [{ type: "Activity", id }],
    }),
    createActivity: builder.mutation<Activity, ActivityInput>({
      query: (body) => ({ url: "/activities/", method: "POST", body }),
      invalidatesTags: [{ type: "Activity", id: LIST }, "Overview"],
    }),
    updateActivity: builder.mutation<Activity, { id: number; body: ActivityInput }>({
      query: ({ id, body }) => ({ url: `/activities/${id}/`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Activity", id },
        { type: "Activity", id: LIST },
        "Overview",
      ],
    }),
    deleteActivity: builder.mutation<void, number>({
      query: (id) => ({ url: `/activities/${id}/`, method: "DELETE" }),
      invalidatesTags: [{ type: "Activity", id: LIST }, "Overview"],
    }),
    markActivityDone: builder.mutation<Activity, number>({
      query: (id) => ({ url: `/activities/${id}/done/`, method: "POST", body: {} }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Activity", id },
        { type: "Activity", id: LIST },
        "Overview",
      ],
    }),

    // ---------------------------------------------------------------- Tags
    listTags: builder.query<Paginated<Tag>, TagListParams | void>({
      query: (params) => ({
        url: "/tags/",
        params: cleanParams({ page_size: 100, ...params }),
      }),
      providesTags: (res) => listTags("Tag", res?.results),
    }),
    createTag: builder.mutation<Tag, TagInput>({
      query: (body) => ({ url: "/tags/", method: "POST", body }),
      invalidatesTags: [{ type: "Tag", id: LIST }],
    }),
    updateTag: builder.mutation<Tag, { id: number; body: TagInput }>({
      query: ({ id, body }) => ({ url: `/tags/${id}/`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Tag", id },
        { type: "Tag", id: LIST },
        "Person",
        "Organization",
        "Deal",
        "Board",
      ],
    }),
    deleteTag: builder.mutation<void, number>({
      query: (id) => ({ url: `/tags/${id}/`, method: "DELETE" }),
      invalidatesTags: [{ type: "Tag", id: LIST }, "Person", "Organization", "Deal", "Board"],
    }),

    // ----------------------------------------------------------- Favorites
    listFavorites: builder.query<Paginated<Favorite>, FavoriteInput | void>({
      query: (params) => ({
        url: "/favorites/",
        params: cleanParams({ page_size: 100, ...params }),
      }),
      providesTags: (res) => listTags("Favorite", res?.results),
    }),
    addFavorite: builder.mutation<Favorite, FavoriteInput>({
      query: (body) => ({ url: "/favorites/", method: "POST", body }),
      invalidatesTags: [{ type: "Favorite", id: LIST }],
    }),
    removeFavorite: builder.mutation<void, number>({
      query: (id) => ({ url: `/favorites/${id}/`, method: "DELETE" }),
      invalidatesTags: [{ type: "Favorite", id: LIST }],
    }),

    // --------------------------------------------------------- Saved views
    listSavedViews: builder.query<Paginated<SavedView>, { object_type?: SavedViewObject } | void>({
      query: (params) => ({
        url: "/views/",
        params: cleanParams({ page_size: 100, ...params }),
      }),
      providesTags: (res) => listTags("SavedView", res?.results),
    }),
    createSavedView: builder.mutation<SavedView, SavedViewInput>({
      query: (body) => ({ url: "/views/", method: "POST", body }),
      invalidatesTags: [{ type: "SavedView", id: LIST }],
    }),
    updateSavedView: builder.mutation<SavedView, { id: number; body: SavedViewInput }>({
      query: ({ id, body }) => ({ url: `/views/${id}/`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "SavedView", id },
        { type: "SavedView", id: LIST },
      ],
    }),
    deleteSavedView: builder.mutation<void, number>({
      query: (id) => ({ url: `/views/${id}/`, method: "DELETE" }),
      invalidatesTags: [{ type: "SavedView", id: LIST }],
    }),
  }),
});

export const {
  useListPersonsQuery,
  useLazyListPersonsQuery,
  useGetPersonQuery,
  useCreatePersonMutation,
  useUpdatePersonMutation,
  useDeletePersonMutation,
  useInvitePersonMutation,
  useLinkPersonUserMutation,
  useMergePersonsMutation,
  useAttachPersonTagMutation,
  useDetachPersonTagMutation,
  usePersonHistoryQuery,
  useSearchQuery,
  useOverviewQuery,
  useListOrganizationsQuery,
  useLazyListOrganizationsQuery,
  useGetOrganizationQuery,
  useCreateOrganizationMutation,
  useUpdateOrganizationMutation,
  useDeleteOrganizationMutation,
  useAttachOrganizationTagMutation,
  useDetachOrganizationTagMutation,
  useOrganizationHistoryQuery,
  useListPipelinesQuery,
  useGetPipelineQuery,
  useCreatePipelineMutation,
  useUpdatePipelineMutation,
  useDeletePipelineMutation,
  useListStagesQuery,
  useCreateStageMutation,
  useUpdateStageMutation,
  useDeleteStageMutation,
  useReorderStagesMutation,
  useListLeadSourcesQuery,
  useCreateLeadSourceMutation,
  useUpdateLeadSourceMutation,
  useDeleteLeadSourceMutation,
  useListDealsQuery,
  useLazyListDealsQuery,
  useDealBoardQuery,
  useDealHistoryQuery,
  useGetDealQuery,
  useCreateDealMutation,
  useUpdateDealMutation,
  useDeleteDealMutation,
  useMoveDealStageMutation,
  useMarkDealWonMutation,
  useMarkDealLostMutation,
  useAttachDealTagMutation,
  useDetachDealTagMutation,
  useListActivitiesQuery,
  useGetActivityQuery,
  useCreateActivityMutation,
  useUpdateActivityMutation,
  useDeleteActivityMutation,
  useMarkActivityDoneMutation,
  useListTagsQuery,
  useCreateTagMutation,
  useUpdateTagMutation,
  useDeleteTagMutation,
  useListFavoritesQuery,
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
  useListSavedViewsQuery,
  useCreateSavedViewMutation,
  useUpdateSavedViewMutation,
  useDeleteSavedViewMutation,
} = crmApi;

/** The DM's own words for a failure, or the caller's translated fallback. */
export function errorMessage(err: unknown, fallback: string): string {
  if (!err || typeof err !== "object") return fallback;
  const e = err as Partial<CrmApiError> & { error?: string; message?: string };
  if (typeof e.detail === "string" && e.detail) return e.detail;
  if (typeof e.error === "string" && e.error) return e.error;
  if (typeof e.message === "string" && e.message) return e.message;
  return fallback;
}

export function errorStatus(err: unknown): number | string | undefined {
  if (!err || typeof err !== "object") return undefined;
  return (err as Partial<CrmApiError>).status;
}
