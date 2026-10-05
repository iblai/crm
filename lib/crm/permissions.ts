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
