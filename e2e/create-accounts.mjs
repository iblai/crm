#!/usr/bin/env node
// pnpm e2e:accounts — creates the two Playwright test accounts, an organization
// admin and a member holding the CRM User role, in the throwaway organization
// iblai.env names (PLATFORM) with its Platform API Token (TOKEN), after the
// platform confirms the token belongs to it. Saves them in the gitignored
// e2e/.env.development. A pair already saved there is kept (delete it to get a
// new account). Prints usernames only: never a password, never the token.
import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const ROLES = [
  {
    role: "admin",
    prefix: "e2e-adm",
    name: "E2E Admin",
    isAdmin: true,
    keys: ["PLAYWRIGHT_USERNAME", "PLAYWRIGHT_PASSWORD"],
  },
  {
    role: "member",
    prefix: "e2e-mem",
    name: "E2E Member",
    isAdmin: false,
    keys: ["PLAYWRIGHT_MEMBER_USERNAME", "PLAYWRIGHT_MEMBER_PASSWORD"],
  },
];

/** The seeded, global CRM role the member gets; without one the CRM sends a member to registration. */
const MEMBER_ROLE = "CRM User";
const MEMBER_POLICY = "E2E CRM User";

/** A fresh account. Platform usernames are [\w.@+-], at most 30 characters. */
export function newAccount(prefix) {
  const username = `${prefix}-${randomBytes(4).toString("hex")}`;
  // base64url holds nothing dotenv reads specially; the suffix satisfies rules that want a digit, a capital and a symbol.
  return {
    username,
    email: `${username}@example.com`,
    password: `${randomBytes(18).toString("base64url")}-Aa1`,
  };
}

/** The organization to create the accounts in: a throwaway one, never the community organization. */
export function resolveOrg({ iblai = {}, env = {}, local = {} }) {
  const org = iblai.PLATFORM || env.IBLAI_ORG || local.NEXT_PUBLIC_MAIN_TENANT_KEY || "";
  if (!org) {
    throw new Error(
      "No PLATFORM in iblai.env: run /iblai-vibe-connect from an empty directory with --origin http://localhost:3000, pick a throwaway organization on the connect page, and move its iblai.env here (from this root it rewrites NEXT_PUBLIC_MAIN_TENANT_KEY).",
    );
  }
  // The community organization and the example placeholders are never a test target.
  if (org === "main" || org.startsWith("your-")) {
    throw new Error(
      `PLATFORM is "${org}", a placeholder: run /iblai-vibe-connect (from an empty directory, iblai.env moved here) and pick a throwaway organization on the connect page — never main.`,
    );
  }
  return org;
}

/** Set KEY=value lines: replaced in place when present, appended otherwise. */
export function mergeEnv(text, values) {
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, "m");
    text = re.test(text)
      ? text.replace(re, () => line)
      : `${text}${text && !text.endsWith("\n") ? "\n" : ""}${line}\n`;
  }
  return text;
}

/** A policy binding the global CRM User role to one user on the whole organization (`/` = the platform root). */
export function crmUserPolicy(org, roleId, userId) {
  return {
    platform_key: org,
    name: MEMBER_POLICY,
    role_id: roleId,
    resources: ["/"],
    users_to_add: [userId],
  };
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function main() {
  const at = (name) => fileURLToPath(new URL(name, import.meta.url));
  const read = (file) => (existsSync(file) ? readFileSync(file, "utf8") : "");
  const files = {
    iblai: dotenv.parse(read(at("../iblai.env"))),
    env: dotenv.parse(read(at("../.env"))),
    local: dotenv.parse(read(at("../.env.local"))),
  };
  let org;
  try {
    org = resolveOrg(files);
  } catch (err) {
    fail(err.message);
  }
  const token = files.iblai.TOKEN || files.local.IBLAI_API_KEY || files.env.IBLAI_API_KEY;
  if (!token || token.startsWith("your-")) {
    fail(
      "No TOKEN in iblai.env (nor IBLAI_API_KEY in .env.local): the organization's Platform API Token, written by /iblai-vibe-connect or minted in the OS under Admin → Integrations → APIs.",
    );
  }
  const api = `${(files.local.NEXT_PUBLIC_API_BASE_URL || "https://api.iblai.app").replace(/\/$/, "")}/dm/api`;
  const headers = { Authorization: `Api-Token ${token}` };

  // A Platform API Token acts in one organization; the platform answers 200 only for that one.
  const probe = await fetch(`${api}/core/platform/users/?platform_key=${org}&page_size=1`, {
    headers,
  });
  if (probe.status !== 200)
    fail(
      `The token is not a Platform API Token for "${org}" (HTTP ${probe.status}): run /iblai-vibe-connect --org ${org} to mint one there.`,
    );

  const send = async (method, path, body, type = "application/json") => {
    const res = await fetch(api + path, {
      method,
      headers: { ...headers, "Content-Type": type },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: res.status, text: await res.text() };
  };
  const post = (path, body, type) => send("POST", path, body, type);
  const list = async (path) => {
    const res = await fetch(api + path, { headers });
    const json = res.status === 200 ? await res.json() : null;
    return { status: res.status, rows: Array.isArray(json) ? json : (json?.results ?? []) };
  };

  const createUser = async (account, name, role) => {
    const body = {
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
      userName: account.username,
      name: { formatted: name },
      emails: [{ value: account.email, primary: true }],
      password: account.password,
      active: true,
    };
    for (let attempt = 1; ; attempt++) {
      const res = await post(`/orgs/${org}/scim/v2/Users`, body, "application/scim+json");
      // 201: created. 200: the name already exists — ours only when it answers a retry.
      if (res.status === 201 || (res.status === 200 && attempt > 1)) return JSON.parse(res.text).id;
      if (res.status === 200)
        fail(`${role}: ${account.username} is taken; run again for a new name.`);
      // 500 right after a create: the account is still propagating; the retry finds it.
      if (res.status !== 500 || attempt === 4)
        fail(
          `${role}: creating ${account.username} failed: HTTP ${res.status} ${res.text.slice(0, 300)}`,
        );
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
  };

  // The seeded "CRM User" policy is internal and cannot take members, so the member gets a policy of its own.
  const grantCrmUser = async (userId) => {
    const roles = await list(
      `/core/rbac/roles/?platform_key=${org}&include_global_roles=true&name=${encodeURIComponent(MEMBER_ROLE)}`,
    );
    const role = roles.rows.find((r) => r.name === MEMBER_ROLE);
    if (!role)
      fail(
        `member: "${org}" has no ${MEMBER_ROLE} role (HTTP ${roles.status}): its CRM roles are not seeded; ask your ibl.ai operator.`,
      );
    const policies = await list(
      `/core/rbac/policies/?platform_key=${org}&name=${encodeURIComponent(MEMBER_POLICY)}`,
    );
    const existing = policies.rows.find((p) => p.name === MEMBER_POLICY);
    const res = existing
      ? await send("PATCH", `/core/rbac/policies/${existing.id}/`, {
          platform_key: org,
          users_to_add: [userId],
        })
      : await post("/core/rbac/policies/", crmUserPolicy(org, role.id, userId));
    if (res.status >= 300)
      fail(`member: granting ${MEMBER_ROLE} failed: HTTP ${res.status} ${res.text.slice(0, 300)}`);
  };

  const envFile = at(".env.development");
  let text = read(envFile) || read(at(".env.development.example"));
  for (const {
    role,
    prefix,
    name,
    isAdmin,
    keys: [userKey, passKey],
  } of ROLES) {
    const saved = dotenv.parse(text);
    if (saved[userKey] && saved[passKey]) {
      console.log(`${role}: ${saved[userKey].split("@")[0]} (already set)`);
      continue;
    }
    const account = newAccount(prefix);
    const id = await createUser(account, name, role);
    const link = await post("/core/users/platforms/", {
      user_id: id,
      platform_key: org,
      active: true,
      is_admin: isAdmin,
    });
    if (link.status >= 300)
      fail(
        `${role}: adding ${account.username} to the organization failed: HTTP ${link.status} ${link.text.slice(0, 300)}`,
      );
    // The pair is saved only once the member can enter the CRM; a member without a CRM role is sent to registration.
    if (!isAdmin) await grantCrmUser(id);
    text = mergeEnv(text, { [userKey]: account.email, [passKey]: account.password });
    writeFileSync(envFile, text);
    chmodSync(envFile, 0o600);
    console.log(`${role}: ${account.username} (created)`);
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url))
  await main();
