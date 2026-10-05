/** The DM's error body → one human line; "" when it says nothing usable (HTML, empty). */
export function detailFromBody(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const d = data as Record<string, unknown>;
  if (typeof d.detail === "string") return d.detail;
  if (Array.isArray(d.detail)) return d.detail.join(" ");
  if (typeof d.message === "string") return d.message;
  if (typeof d.error === "string") return d.error;
  // DRF field errors: { field: ["msg"] }
  const first = Object.entries(d)[0];
  if (!first) return "";
  const [field, msgs] = first;
  return `${field}: ${Array.isArray(msgs) ? msgs.join(" ") : String(msgs)}`;
}

/** A 409's `protected_by: {deals: n}` — how many records still point at this one. */
export function protectedCount(err: unknown): number {
  const data = (err as { data?: { protected_by?: Record<string, number> } } | null)?.data;
  return Object.values(data?.protected_by ?? {}).reduce((sum, n) => sum + n, 0);
}
