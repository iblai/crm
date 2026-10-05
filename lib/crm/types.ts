/**
 * ibl.ai CRM resource types — mirrors the Platform-scoped REST API at
 * `/dm/api/crm/` (see the `iblai-api-crm` skill and `@iblai/iblai-api`
 * `CrmService`). Person and Organization ids are UUID strings; everything
 * else is an integer.
 */

export type LifecycleStage = "lead" | "qualified" | "opportunity" | "customer" | "churned";
export type DealStatus = "open" | "won" | "lost";
export type ActivityType = "call" | "meeting" | "email" | "note" | "task" | "lunch" | "deadline";

export const LIFECYCLE_STAGES: readonly LifecycleStage[] = [
  "lead",
  "qualified",
  "opportunity",
  "customer",
  "churned",
];

export const ACTIVITY_TYPES: readonly ActivityType[] = [
  "call",
  "meeting",
  "email",
  "note",
  "task",
  "lunch",
  "deadline",
];

export const DEAL_STATUSES: readonly DealStatus[] = ["open", "won", "lost"];

export interface TagChip {
  id: number;
  name: string;
  color: string;
}

export interface Paginated<T> {
  count: number;
  next_page: number | null;
  previous_page: number | null;
  results: T[];
}

export interface Person {
  id: string;
  platform: number;
  name: string;
  primary_email?: string;
  emails?: string[];
  contact_numbers?: string[];
  job_title?: string;
  organization?: string | null;
  /** Read-only: the organization's name. */
  organization_name?: string | null;
  owner?: number | null;
  platform_user: number | null;
  lifecycle_stage?: LifecycleStage;
  unique_id?: string;
  active: boolean;
  tags: TagChip[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type PersonInput = Partial<
  Pick<
    Person,
    | "name"
    | "primary_email"
    | "emails"
    | "contact_numbers"
    | "job_title"
    | "organization"
    | "owner"
    | "lifecycle_stage"
    | "unique_id"
    | "metadata"
  >
>;

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  [k: string]: unknown;
}

export interface Organization {
  id: string;
  platform: number;
  name: string;
  address?: Address;
  owner?: number | null;
  tags: TagChip[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type OrganizationInput = Partial<
  Pick<Organization, "name" | "address" | "owner" | "metadata">
>;

export interface PipelineStage {
  id: number;
  pipeline: number;
  code: string;
  name: string;
  probability?: number;
  sort_order?: number;
  is_won?: boolean;
  is_lost?: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type PipelineStageInput = Partial<
  Pick<
    PipelineStage,
    "code" | "name" | "probability" | "sort_order" | "is_won" | "is_lost" | "metadata"
  >
>;

export interface Pipeline {
  id: number;
  platform: number;
  name: string;
  code: string;
  is_default?: boolean;
  rotten_days?: number;
  stages: PipelineStage[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type PipelineInput = Partial<
  Pick<Pipeline, "name" | "code" | "is_default" | "rotten_days" | "metadata">
>;

export interface LeadSource {
  id: number;
  platform: number;
  name: string;
  code: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type LeadSourceInput = Partial<Pick<LeadSource, "name" | "code" | "metadata">>;

export interface Deal {
  id: number;
  platform: number;
  title: string;
  description?: string;
  /** Decimal string, e.g. "1500.00". */
  lead_value?: string;
  currency?: string;
  status: DealStatus;
  /** Open and untouched for longer than the pipeline's `rotten_days`. */
  is_stale: boolean;
  lost_reason?: string;
  expected_close_date?: string | null;
  closed_at: string | null;
  person: string;
  /** Read-only: the person's name. */
  person_name: string;
  organization?: string | null;
  /** Read-only: the organization's name. */
  organization_name: string | null;
  pipeline: number;
  stage: number;
  source?: number | null;
  owner?: number | null;
  tags: TagChip[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type DealInput = Partial<
  Pick<
    Deal,
    | "title"
    | "description"
    | "lead_value"
    | "currency"
    | "lost_reason"
    | "expected_close_date"
    | "person"
    | "organization"
    | "pipeline"
    | "stage"
    | "source"
    | "owner"
    | "metadata"
  >
>;

export interface Activity {
  id: number;
  platform: number;
  title: string;
  type: ActivityType;
  location?: string;
  comment?: string;
  schedule_from?: string | null;
  schedule_to?: string | null;
  is_done?: boolean;
  done_at: string | null;
  deal?: number | null;
  person?: string | null;
  organization?: string | null;
  owner?: number | null;
  reminder_at?: string | null;
  reminder_sent: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type ActivityInput = Partial<
  Pick<
    Activity,
    | "title"
    | "type"
    | "location"
    | "comment"
    | "schedule_from"
    | "schedule_to"
    | "is_done"
    | "deal"
    | "person"
    | "organization"
    | "owner"
    | "reminder_at"
    | "metadata"
  >
>;

export interface Tag {
  id: number;
  platform: number;
  name: string;
  color?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type TagInput = Partial<Pick<Tag, "name" | "color" | "metadata">>;

export interface PersonInviteRequest {
  is_admin?: boolean;
  is_staff?: boolean;
  enrollment_config?: Record<string, unknown>;
  redirect_to?: string;
}

export interface PersonInviteResponse {
  person_id: string;
  invitation_id: number;
  invitation_email: string;
  platform_key: string;
  auto_accept: boolean;
  active: boolean;
  redirect_to: string | null;
  created: string | null;
}

export interface PersonMergeRequest {
  primary_id: string;
  duplicate_ids: string[];
}

export interface PersonMergeResponse {
  primary_id: string;
  merged_ids?: string[];
  [k: string]: unknown;
}

export interface TagAttachResponse {
  assignment_id: number;
  tag: TagChip;
}

export type DateFilter = "today" | "7d" | "30d" | "90d" | "all_time" | "custom";

/** Common list query params: paging, `search`, `ordering` and a created-at window. */
export interface ListParams {
  page?: number;
  page_size?: number;
  search?: string;
  /** A column name, `-` prefix for descending. */
  ordering?: string;
  date_filter?: DateFilter;
  start_date?: string;
  end_date?: string;
}

export interface PersonListParams extends ListParams {
  lifecycle_stage?: LifecycleStage;
  active?: boolean;
  owner?: number;
  organization?: string;
  tags?: string;
  created_at__gte?: string;
  created_at__lte?: string;
  metadata__has_key?: string;
}

export interface OrganizationListParams extends ListParams {
  name?: string;
  owner?: number;
  tags?: string;
}

export interface DealListParams extends ListParams {
  status?: DealStatus;
  pipeline?: number;
  stage?: number;
  owner?: number;
  source?: number;
  person?: string;
  organization?: string;
  tags?: string;
  expected_close_date__gte?: string;
  expected_close_date__lte?: string;
  created_at__gte?: string;
  created_at__lte?: string;
  metadata__has_key?: string;
}

export interface ActivityListParams extends ListParams {
  type?: ActivityType;
  is_done?: boolean;
  owner?: number;
  deal?: number;
  person?: string;
  organization?: string;
  schedule_from__gte?: string;
  schedule_from__lte?: string;
  metadata__has_key?: string;
}

export interface TagListParams extends ListParams {
  name?: string;
  created_at__gte?: string;
  created_at__lte?: string;
}

export interface PipelineListParams extends ListParams {
  code?: string;
  name?: string;
  is_default?: boolean;
}

export interface LeadSourceListParams extends ListParams {
  code?: string;
  name?: string;
}

/** Shape of an API error as normalized by the CRM slice. */
export interface CrmApiError {
  status: number | string;
  detail: string;
  data?: unknown;
}

export interface SearchResponse {
  q: string;
  persons?: Pick<
    Person,
    "id" | "name" | "primary_email" | "job_title" | "organization" | "lifecycle_stage"
  >[];
  organizations?: Pick<Organization, "id" | "name">[];
  deals?: Pick<
    Deal,
    | "id"
    | "title"
    | "status"
    | "lead_value"
    | "currency"
    | "person"
    | "organization"
    | "pipeline"
    | "stage"
  >[];
}

export interface OverviewStage {
  stage: PipelineStage;
  count: number;
  total_value: string;
  weighted_value: string;
}

export interface OverviewMonth {
  /** `YYYY-MM`. */
  month: string;
  won_count: number;
  won_value: string;
  lost_count: number;
  lost_value: string;
}

export interface Overview {
  persons?: { count: number };
  organizations?: { count: number };
  deals?: {
    pipeline: Pipeline | null;
    currency: string | null;
    open_count: number;
    pipeline_value: string;
    weighted_value: string;
    won_this_month_count: number;
    won_this_month_value: string;
    lost_this_month_count: number;
    lost_this_month_value: string;
    by_stage: OverviewStage[];
    won_lost_by_month: OverviewMonth[];
  };
  activities?: { open_count: number; due_today: number; overdue: number };
  period_start_date?: string;
  period_end_date?: string;
  period_persons_created?: number;
  period_deals_created?: number;
  period_deals_won?: number;
  period_deals_won_value?: string;
  period_deals_lost?: number;
  period_deals_lost_value?: string;
  period_activities_done?: number;
}

export interface OverviewParams {
  date_filter?: DateFilter;
  start_date?: string;
  end_date?: string;
  pipeline?: number;
}

export interface DealBoardStage {
  stage: PipelineStage;
  count: number;
  total_value: string;
  weighted_value: string;
  has_more: boolean;
  deals: Deal[];
}

export interface DealBoard {
  pipeline: Pipeline;
  limit: number;
  stages: DealBoardStage[];
}

export interface DealBoardParams extends Omit<DealListParams, "page" | "page_size" | "pipeline"> {
  pipeline?: number;
  limit?: number;
}

export type FavoriteTargetType = "person" | "organization" | "deal";

export interface Favorite {
  id: number;
  platform: number;
  person: string | null;
  organization: string | null;
  deal: number | null;
  target_type: FavoriteTargetType;
  label: string;
  created_at: string;
}

export type FavoriteInput = { person: string } | { organization: string } | { deal: number };

export type SavedViewObject = "persons" | "organizations" | "deals" | "activities";
export type SavedViewType = "table" | "kanban";

export interface ViewColumn {
  id: string;
  visible: boolean;
}

export interface ViewFilter {
  field: string;
  op: string;
  value?: unknown;
}

export interface ViewSort {
  field: string;
  dir: "asc" | "desc";
}

export interface SavedView {
  id: number;
  platform: number;
  object_type: SavedViewObject;
  name: string;
  type: SavedViewType;
  columns: ViewColumn[];
  filters: ViewFilter[];
  sorts: ViewSort[];
  group_by: string;
  created_at: string;
  updated_at: string;
}

export type SavedViewInput = Partial<
  Pick<SavedView, "object_type" | "name" | "type" | "columns" | "filters" | "sorts" | "group_by">
>;

/** One audit entry from `…/{id}/history/`. */
export interface HistoryEntry {
  id: number;
  timestamp: string;
  action: "create" | "update" | "delete" | "access";
  actor_username: string | null;
  /** `{ field: [old, new] }` for updates. */
  changes: Record<string, [string, string]> | null;
}

/** A platform user, as listed by the org's member directory (for owner pickers). */
export interface PlatformMember {
  id: number;
  username: string;
  email?: string;
  name?: string;
}
