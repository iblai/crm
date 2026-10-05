import { describe, expect, it } from "vitest";

import { detailFromBody, protectedCount } from "../lib/crm/errors";

describe("detailFromBody", () => {
  it("reads the DM's detail, as a string or a list", () => {
    expect(detailFromBody({ detail: "Not found." })).toBe("Not found.");
    expect(detailFromBody({ detail: ["Pass exactly one of", "person"] })).toBe(
      "Pass exactly one of person",
    );
  });

  it("names the field of a DRF field error", () => {
    expect(detailFromBody({ name: ["This field is required."] })).toBe(
      "name: This field is required.",
    );
  });

  it("says nothing for an HTML page or an empty body", () => {
    expect(detailFromBody("<html>500</html>")).toBe("");
    expect(detailFromBody(undefined)).toBe("");
    expect(detailFromBody({})).toBe("");
  });
});

describe("protectedCount", () => {
  it("sums what still references the record", () => {
    expect(protectedCount({ status: 409, data: { protected_by: { deals: 3 } } })).toBe(3);
    expect(protectedCount({ status: 400, data: { name: ["x"] } })).toBe(0);
    expect(protectedCount(null)).toBe(0);
  });
});
