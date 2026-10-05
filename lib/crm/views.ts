import type {
  SavedView,
  SavedViewInput,
  SavedViewObject,
  ViewColumn,
  ViewFilter,
  ViewSort,
} from "./types";

/** What a filterable field is, which decides its operands and its input. */
export type FieldKind = "text" | "select" | "relation" | "date" | "boolean" | "number";
export type FilterOp = "contains" | "is" | "isAfter" | "isBefore";

export interface FieldDef {
  id: string;
  kind: FieldKind;
  /** Query parameter the DM filters on (defaults to `id`). */
  param?: string;
  /** Column that can be sorted on (defaults to `id` when sortable). */
  sortable?: boolean;
  /** Choice fields take their options from the enum the id names. */
  options?: "lifecycle" | "dealStatus" | "activityType";
  /** Relation fields look their options up here. */
  relation?: "owner" | "organization" | "person" | "deal" | "pipeline" | "stage" | "source" | "tag";
  /** The list's table can show and hide it. */
  column?: true;
  /** The DM has no filter for it: sort and column only. */
  filter?: false;
  /** A datetime column: an on-or-before bound ends at 23:59:59 UTC. */
  datetime?: true;
}

/** Only what the DM evaluates: no client-side emulation on a page of rows. */
export const FILTER_OPERANDS: Record<FieldKind, readonly FilterOp[]> = {
  text: ["contains"],
  select: ["is"],
  relation: ["is"],
  date: ["isAfter", "isBefore"],
  boolean: ["is"],
  number: [],
};

/** The fields each list can filter and sort, and the table columns it can toggle. */
export const VIEW_FIELDS: Record<SavedViewObject, FieldDef[]> = {
  persons: [
    { id: "name", kind: "text", sortable: true },
    { id: "primary_email", kind: "text", sortable: true },
    { id: "job_title", kind: "text", sortable: true, column: true },
    { id: "organization", kind: "relation", relation: "organization", column: true },
    { id: "lifecycle_stage", kind: "select", options: "lifecycle", sortable: true },
    { id: "owner", kind: "relation", relation: "owner", column: true },
    { id: "tags", kind: "relation", relation: "tag", column: true },
    { id: "active", kind: "boolean" },
    { id: "created_at", kind: "date", sortable: true, column: true, datetime: true },
    { id: "updated_at", kind: "date", sortable: true, filter: false },
  ],
  organizations: [
    { id: "name", kind: "text", sortable: true },
    { id: "owner", kind: "relation", relation: "owner" },
    { id: "tags", kind: "relation", relation: "tag" },
    { id: "created_at", kind: "date", sortable: true, filter: false },
    { id: "updated_at", kind: "date", sortable: true, filter: false },
  ],
  deals: [
    { id: "title", kind: "text", sortable: true, column: true },
    { id: "stage", kind: "relation", relation: "stage", column: true },
    { id: "status", kind: "select", options: "dealStatus", sortable: true, column: true },
    { id: "lead_value", kind: "number", sortable: true, column: true, filter: false },
    { id: "person", kind: "relation", relation: "person", column: true },
    { id: "organization", kind: "relation", relation: "organization", column: true },
    { id: "owner", kind: "relation", relation: "owner", column: true },
    { id: "source", kind: "relation", relation: "source", column: true },
    { id: "expected_close_date", kind: "date", sortable: true, column: true },
    { id: "tags", kind: "relation", relation: "tag", column: true },
    { id: "created_at", kind: "date", sortable: true, column: true, datetime: true },
  ],
  activities: [
    { id: "title", kind: "text", sortable: true },
    { id: "type", kind: "select", options: "activityType", sortable: true },
    { id: "is_done", kind: "boolean", sortable: true },
    { id: "owner", kind: "relation", relation: "owner" },
    { id: "person", kind: "relation", relation: "person" },
    { id: "organization", kind: "relation", relation: "organization" },
    { id: "deal", kind: "relation", relation: "deal", filter: false },
    { id: "schedule_from", kind: "date", sortable: true, datetime: true },
    { id: "created_at", kind: "date", sortable: true, filter: false },
  ],
};

/** Columns in order: the view's list, with any field it does not mention appended hidden. */
export function resolveColumns(objectType: SavedViewObject, view?: Pick<SavedView, "columns">) {
  const known = VIEW_FIELDS[objectType].filter((f) => f.column);
  const picked = (view?.columns ?? []).filter((c) => known.some((f) => f.id === c.id));
  if (picked.length === 0) return known.map<ViewColumn>((f) => ({ id: f.id, visible: true }));
  const missing = known.filter((f) => !picked.some((c) => c.id === f.id));
  return [...picked, ...missing.map<ViewColumn>((f) => ({ id: f.id, visible: false }))];
}

/** One ANDed filter list → the DM list query parameters; `contains` terms join the `search`. */
export function filtersToParams(objectType: SavedViewObject, filters: ViewFilter[]) {
  const params: Record<string, string | number | boolean> = {};
  for (const filter of filters) {
    const field = VIEW_FIELDS[objectType].find((f) => f.id === filter.field);
    if (!field || field.filter === false) continue;
    const name = field.param ?? field.id;
    const value = filter.value;
    switch (filter.op) {
      case "is":
        if (value !== undefined && value !== null && value !== "") {
          params[name] = value as string | number | boolean;
        }
        break;
      case "contains":
        if (typeof value === "string" && value.trim()) {
          // DRF's SearchFilter ANDs whitespace-separated terms.
          params.search = [params.search, value.trim()].filter(Boolean).join(" ");
        }
        break;
      case "isAfter":
        if (typeof value === "string" && value) params[`${name}__gte`] = value;
        break;
      case "isBefore":
        if (typeof value === "string" && value) {
          params[`${name}__lte`] = field.datetime ? `${value}T23:59:59Z` : value;
        }
        break;
      default:
        break;
    }
  }
  return params;
}

/** Whether a stored filter is one its field still offers (older views may hold more). */
export function isSupportedFilter(objectType: SavedViewObject, filter: ViewFilter) {
  const field = VIEW_FIELDS[objectType].find((f) => f.id === filter.field);
  return (
    !!field &&
    field.filter !== false &&
    (FILTER_OPERANDS[field.kind] as string[]).includes(filter.op)
  );
}

/** The `ordering` parameter for the first sort (the DM sorts on one column). */
export function sortsToOrdering(objectType: SavedViewObject, sorts: ViewSort[]) {
  const first = sorts.find((s) =>
    VIEW_FIELDS[objectType].some((f) => f.id === s.field && f.sortable),
  );
  if (!first) return undefined;
  return first.dir === "desc" ? `-${first.field}` : first.field;
}

/** The draft a list page edits; `id` is set once it is a saved view. */
export interface ViewDraft extends Required<Omit<SavedViewInput, "name">> {
  id?: number;
  name: string;
}

export function emptyDraft(objectType: SavedViewObject): ViewDraft {
  return {
    object_type: objectType,
    name: "",
    type: "table",
    columns: resolveColumns(objectType),
    filters: [],
    sorts: [],
    group_by: objectType === "deals" ? "stage" : "",
  };
}

export function draftFrom(view: SavedView): ViewDraft {
  return {
    id: view.id,
    object_type: view.object_type,
    name: view.name,
    type: view.type,
    columns: resolveColumns(view.object_type, view),
    filters: view.filters.filter((f) => isSupportedFilter(view.object_type, f)),
    sorts: view.sorts,
    group_by: view.group_by,
  };
}

/** Whether the draft differs from what is saved (or from `unsavedBase`, the page's own default). */
export function isDirty(draft: ViewDraft, saved?: SavedView, unsavedBase?: ViewDraft) {
  const base = saved ? draftFrom(saved) : (unsavedBase ?? emptyDraft(draft.object_type));
  const pick = (d: ViewDraft) => ({
    type: d.type,
    columns: d.columns,
    filters: d.filters,
    sorts: d.sorts,
    group_by: d.group_by,
  });
  return JSON.stringify(pick(draft)) !== JSON.stringify(pick(base));
}
