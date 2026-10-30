/** The DM's platform flag behind `Ibl.CRM/Pipelines/write`; CRM Managers hold it. */
export const MANAGE_CRM_FLAG = "can_write_crm_pipelines";

/**
 * Settings opens to org admins in Admin mode and to members holding the CRM
 * Manager flag. An admin holds every flag (Tenant Admins → `Ibl.*`), so for
 * them the switch alone decides. `permissions` is the SDK store's RBAC map,
 * `{"/platforms/<key>/": {<flag>: boolean}}`.
 */
export function canManageCrm(
  permissions: object,
  tenantKey: string,
  { isAdmin, adminMode }: { isAdmin: boolean; adminMode: boolean },
) {
  if (isAdmin) return adminMode;
  const flags = (permissions as Record<string, Record<string, unknown> | undefined>)[
    `/platforms/${tenantKey}/`
  ];
  return Boolean(flags?.[MANAGE_CRM_FLAG]);
}

/** The DM's list flags (`Ibl.CRM/<object>/list`): what it takes to see CRM data. */
const VIEW_FLAG = /^can_view_crm_/;

export type Entry = "enter" | "sample" | "register" | { switchTo: string };

/**
 * Where a signed-in user may work. `enter` while unknown (no organizations
 * stored, no flags for this platform) or when they can see CRM data here;
 * otherwise back to the organization they came from, or to one they
 * administer; with neither, ibl.ai registration — except on the community
 * organization `main`, where they browse the sample data instead.
 */
export function decideEntry(
  tenants: ReadonlyArray<{ key: string; is_admin?: boolean }>,
  permissions: object,
  tenantKey: string,
  previous?: string | null,
  main?: string,
): Entry {
  const flags = (permissions as Record<string, Record<string, unknown> | undefined>)[
    `/platforms/${tenantKey}/`
  ];
  const admin = !!tenants.find((t) => t.key === tenantKey)?.is_admin;
  const canView =
    !!flags && Object.entries(flags).some(([name, on]) => VIEW_FLAG.test(name) && on === true);
  const back =
    previous && previous !== tenantKey && tenants.some((t) => t.key === previous)
      ? previous
      : undefined;
  const target = back ?? tenants.find((t) => t.is_admin && t.key !== tenantKey)?.key;
  if (main && tenantKey === main && !admin && !canView) {
    return target ? { switchTo: target } : "sample";
  }
  if (tenants.length === 0 || !flags || admin || canView) return "enter";
  return target ? { switchTo: target } : "register";
}
