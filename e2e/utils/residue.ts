import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

/**
 * Run-level teardown: delete every E2E-prefixed record the journeys left in
 * the organization, through the CRM API with the admin session's token.
 * Loud: a delete that fails stops the sweep. `E2E_SKIP_SWEEP=1` keeps the
 * records for debugging.
 */
const PREFIX = "E2E ";

/** Deletion order: what references something comes first (activities before deals, deals before persons…). */
const TYPES: ReadonlyArray<readonly [type: string, nameKey: string]> = [
  ["views", "name"],
  ["activities", "title"],
  ["deals", "title"],
  ["persons", "name"],
  ["organizations", "name"],
  ["tags", "name"],
  ["lead-sources", "name"],
  ["pipelines", "name"],
];

type Row = Record<string, unknown> & { id: string | number };

/** The DM closes idle sockets under the suite's load; one retry covers it, three failures are loud. */
async function call(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetch(url, init);
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
  }
}

export default async function residue() {
  const log = (message: string) => console.log(`[e2e-residue] ${message}`);
  if (process.env.E2E_SKIP_SWEEP) return log("skipped (E2E_SKIP_SWEEP)");
  const state = path.resolve(__dirname, "../../playwright/.auth/user-setup-chromium.json");
  if (!fs.existsSync(state)) return log("nothing to sweep: no admin session");
  const session = JSON.parse(fs.readFileSync(state, "utf8")) as {
    origins?: Array<{ localStorage?: Array<{ name: string; value: string }> }>;
  };
  const token = session.origins
    ?.flatMap((o) => o.localStorage ?? [])
    .find((entry) => entry.name === "dm_token")?.value;
  if (!token) return log("nothing to sweep: the session holds no dm_token");

  const localEnv = path.resolve(__dirname, "../../.env.local");
  const local = fs.existsSync(localEnv) ? dotenv.parse(fs.readFileSync(localEnv, "utf8")) : {};
  const base = (local.NEXT_PUBLIC_API_BASE_URL || "https://api.iblai.app").replace(/\/$/, "");
  const api = `${base}/dm/api/crm`;
  const headers = { Authorization: `Token ${token}`, "Content-Type": "application/json" };

  for (const [type, key] of TYPES) {
    let deleted = 0;
    // Always the first page: deleting shifts the pages, and the search already narrows to ours.
    for (;;) {
      const res = await call(
        `${api}/${type}/?search=${encodeURIComponent(PREFIX.trim())}&page_size=100`,
        { headers },
      );
      if (!res.ok) throw new Error(`[e2e-residue] GET ${type} → HTTP ${res.status}`);
      const body = (await res.json()) as Row[] | { results?: Row[] };
      const rows = Array.isArray(body) ? body : (body.results ?? []);
      const ours = rows.filter((row) => String(row[key] ?? "").startsWith(PREFIX));
      if (ours.length === 0) break;
      for (const row of ours) {
        const del = await call(`${api}/${type}/${row.id}/`, { method: "DELETE", headers });
        if (!del.ok && del.status !== 404) {
          throw new Error(`[e2e-residue] DELETE ${type}/${row.id} → HTTP ${del.status}`);
        }
        deleted++;
      }
    }
    log(`${type}: ${deleted} deleted`);
  }
}
