import config from "@/lib/iblai/config";
import { decideEntry } from "@/lib/crm/permissions";
import {
  readCurrentTenantKey,
  readTenants,
  readUserData,
  readUserId,
  readUsername,
  tenantKeyFromPath,
} from "@/lib/iblai/tenant";
import type { SampleVisitor } from "./data";

/** Whether this tab browses the sample: the community organization, for someone `decideEntry` sends to it. */
export function sampleSession(permissions: object, pathname: string): boolean {
  const main = config.mainTenantKey();
  const org = tenantKeyFromPath(pathname) ?? readCurrentTenantKey();
  return org === main && decideEntry(readTenants(), permissions, org, null, main) === "sample";
}

/** The signed-in user, who owns part of the sample. */
export function sampleVisitor(): SampleVisitor {
  const user = readUserData();
  const name = [user?.user_fullname, user?.user_display_name]
    .map((v) => String(v ?? "").trim())
    .find(Boolean);
  return { id: readUserId() ?? 9001, username: readUsername() || "you", name };
}
