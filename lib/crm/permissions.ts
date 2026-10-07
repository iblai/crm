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

/** Every platform flag the DM derives from an `Ibl.CRM/*` verb carries `crm` in its name. */
const CRM_FLAG = /crm/;

/**
 * A signed-in user with no organization of their own: admin nowhere and no CRM
 * permission in the organization being entered. False while unknown — no
 * organizations stored yet, or no flags loaded for this platform.
 */
export function needsOrganization(
  tenants: ReadonlyArray<{ is_admin?: boolean }>,
  permissions: object,
  tenantKey: string,
): boolean {
  if (tenants.length === 0 || tenants.some((t) => t.is_admin)) return false;
  const flags = (permissions as Record<string, Record<string, unknown> | undefined>)[
    `/platforms/${tenantKey}/`
  ];
  if (!flags) return false;
  return !Object.entries(flags).some(([name, on]) => CRM_FLAG.test(name) && on === true);
}
