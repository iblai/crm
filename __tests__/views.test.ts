import { describe, expect, it } from "vitest";

import en from "../messages/en.json";
import type { SavedView } from "../lib/crm/types";
import {
  VIEW_FIELDS,
  draftFrom,
  emptyDraft,
  filtersToParams,
  isDirty,
  nextFilterOp,
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
      for (const field of fields)
        expect(Object.keys(labels).map((k) => `${object}.${k}`)).toContain(`${object}.${field.id}`);
    }
  });
});

describe("sort-only fields", () => {
  it("never reach the server params", () => {
    expect(
      filtersToParams("organizations", [
        { field: "created_at", op: "isAfter", value: "2026-01-01" },
        { field: "updated_at", op: "isBefore", value: "2026-02-01" },
      ]),
    ).toEqual({});
    expect(VIEW_FIELDS.persons.find((f) => f.id === "updated_at")?.filter).toBe(false);
    expect(VIEW_FIELDS.persons.find((f) => f.id === "created_at")?.filter).toBeUndefined();
  });
});

describe("search terms and date bounds", () => {
  it("joins every contains filter into one search", () => {
    expect(
      filtersToParams("deals", [
        { field: "title", op: "contains", value: "renewal" },
        { field: "title", op: "contains", value: " acme " },
      ]),
    ).toEqual({ search: "renewal acme" });
  });

  it("ends an on-or-before bound on a datetime column at the end of the day", () => {
    expect(
      filtersToParams("deals", [{ field: "created_at", op: "isBefore", value: "2026-10-01" }]),
    ).toEqual({ created_at__lte: "2026-10-01T23:59:59Z" });
    expect(
      filtersToParams("deals", [
        { field: "expected_close_date", op: "isBefore", value: "2026-10-01" },
      ]),
    ).toEqual({ expected_close_date__lte: "2026-10-01" });
  });
});

describe("older saved views", () => {
  it("drops operators the DM cannot evaluate", () => {
    expect(draftFrom(saved).filters.map((f) => f.op)).toEqual(["is", "is", "contains", "isAfter"]);
  });

  it("compares an unsaved draft against the page's own default", () => {
    const board = { ...emptyDraft("deals"), type: "kanban" as const };
    expect(isDirty(board)).toBe(true);
    expect(isDirty(board, undefined, board)).toBe(false);
  });
});

describe("nextFilterOp", () => {
  const field = (id: string) => VIEW_FIELDS.persons.find((f) => f.id === id)!;

  it("adds another contains term but one is per field", () => {
    expect(nextFilterOp(field("name"), [{ field: "name", op: "contains", value: "a" }])).toBe(
      "contains",
    );
    expect(nextFilterOp(field("tags"), [])).toBe("is");
    expect(nextFilterOp(field("tags"), [{ field: "tags", op: "is", value: "1" }])).toBeNull();
  });

  it("offers a date's after, then before, then nothing; never a sort-only field", () => {
    const after = { field: "created_at", op: "isAfter" as const, value: "2026-01-01" };
    const before = { field: "created_at", op: "isBefore" as const, value: "2026-02-01" };
    expect(nextFilterOp(field("created_at"), [])).toBe("isAfter");
    expect(nextFilterOp(field("created_at"), [after])).toBe("isBefore");
    expect(nextFilterOp(field("created_at"), [after, before])).toBeNull();
    expect(nextFilterOp(field("updated_at"), [])).toBeNull();
  });
});
