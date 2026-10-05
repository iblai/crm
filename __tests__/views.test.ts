import { describe, expect, it } from "vitest";

import en from "../messages/en.json";
import type { SavedView } from "../lib/crm/types";
import {
  VIEW_FIELDS,
  applyClientFilters,
  draftFrom,
  emptyDraft,
  filtersToParams,
  isDirty,
  resolveColumns,
  sortsToOrdering,
} from "../lib/crm/views";

const saved: SavedView = {
  id: 7,
  platform: 1,
  object_type: "deals",
  name: "Open, biggest first",
  type: "table",
  columns: [
    { id: "title", visible: true },
    { id: "lead_value", visible: true },
    { id: "status", visible: false },
  ],
  filters: [
    { field: "status", op: "is", value: "open" },
    { field: "owner", op: "is", value: 42 },
    { field: "title", op: "contains", value: "  renewal " },
    { field: "expected_close_date", op: "isAfter", value: "2026-06-01" },
    { field: "lead_value", op: "gte", value: 1000 },
    { field: "organization", op: "isEmpty" },
    { field: "nonsense", op: "is", value: 1 },
  ],
  sorts: [
    { field: "stage", dir: "asc" },
    { field: "lead_value", dir: "desc" },
  ],
  group_by: "",
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

describe("filtersToParams", () => {
  it("maps what the DM can filter and skips the rest", () => {
    expect(filtersToParams("deals", saved.filters)).toEqual({
      status: "open",
      owner: 42,
      search: "renewal",
      expected_close_date__gte: "2026-06-01",
    });
  });

  it("ignores empty values and unknown fields", () => {
    expect(
      filtersToParams("persons", [
        { field: "owner", op: "is", value: "" },
        { field: "lifecycle_stage", op: "is", value: null },
        { field: "name", op: "contains", value: "   " },
        { field: "bogus", op: "contains", value: "x" },
      ]),
    ).toEqual({});
  });
});

describe("sortsToOrdering", () => {
  it("uses the first sortable sort, descending with a dash", () => {
    expect(sortsToOrdering("deals", saved.sorts)).toBe("-lead_value");
    expect(sortsToOrdering("deals", [{ field: "title", dir: "asc" }])).toBe("title");
  });

  it("is undefined without a sortable sort", () => {
    expect(sortsToOrdering("deals", [])).toBeUndefined();
    expect(sortsToOrdering("deals", [{ field: "owner", dir: "asc" }])).toBeUndefined();
  });
});

describe("applyClientFilters", () => {
  const rows = [
    { id: 1, lead_value: "500.00", organization: null, status: "open" },
    { id: 2, lead_value: "1500.00", organization: "org-a", status: "open" },
    { id: 3, lead_value: "2500.00", organization: "", status: "won" },
  ];

  it("applies the operands the DM lacks", () => {
    expect(applyClientFilters(rows, "deals", saved.filters).map((r) => r.id)).toEqual([3]);
    expect(
      applyClientFilters(rows, "deals", [{ field: "status", op: "isNot", value: "won" }]).map(
        (r) => r.id,
      ),
    ).toEqual([1, 2]);
    expect(
      applyClientFilters(rows, "deals", [{ field: "organization", op: "isNotEmpty" }]).map(
        (r) => r.id,
      ),
    ).toEqual([2]);
    expect(
      applyClientFilters(rows, "deals", [{ field: "lead_value", op: "lte", value: 1500 }]).map(
        (r) => r.id,
      ),
    ).toEqual([1, 2]);
  });

  it("leaves rows alone when every filter is server-side", () => {
    expect(applyClientFilters(rows, "deals", [{ field: "status", op: "is", value: "open" }])).toBe(
      rows,
    );
  });
});

describe("resolveColumns", () => {
  it("defaults to every toggleable column, visible", () => {
    const columns = resolveColumns("persons");
    expect(columns.map((c) => c.id)).toEqual([
      "job_title",
      "organization",
      "owner",
      "tags",
      "created_at",
    ]);
    expect(columns.every((c) => c.visible)).toBe(true);
    expect(resolveColumns("organizations")).toEqual([]);
  });

  it("keeps the view's order and appends the rest hidden", () => {
    const columns = resolveColumns("deals", saved);
    expect(columns.slice(0, 3).map((c) => c.id)).toEqual(["title", "lead_value", "status"]);
    expect(columns.slice(3).every((c) => !c.visible)).toBe(true);
    expect(columns.map((c) => c.id)).toContain("expected_close_date");
  });
});

describe("drafts", () => {
  it("starts clean and turns dirty when edited", () => {
    const draft = emptyDraft("deals");
    expect(draft.group_by).toBe("stage");
    expect(isDirty(draft)).toBe(false);
    expect(isDirty({ ...draft, type: "kanban" })).toBe(true);
  });

  it("compares against the saved view it came from", () => {
    const draft = draftFrom(saved);
    expect(draft.id).toBe(7);
    expect(isDirty(draft, saved)).toBe(false);
    expect(isDirty({ ...draft, sorts: [] }, saved)).toBe(true);
  });
});

describe("labels", () => {
  it("gives every view field a fields.<object>.<id> message", () => {
    for (const [object, fields] of Object.entries(VIEW_FIELDS)) {
      const labels = en.fields[object as keyof typeof VIEW_FIELDS];
      for (const field of fields) expect(Object.keys(labels), object).toContain(field.id);
    }
  });
});
