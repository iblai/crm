/** The DM's platform flag behind `Ibl.CRM/Pipelines/write`; CRM Managers hold it. */
export const MANAGE_CRM_FLAG = "can_write_crm_pipelines";

/**
 * Settings is for org admins in Admin mode and for CRM Managers. `permissions`
 * is the SDK store's RBAC map, `{"/platforms/<key>/": {<flag>: boolean}}`.
 */
export function canManageCrm(permissions: object, tenantKey: string, adminMode: boolean) {
  if (adminMode) return true;
  const flags = (permissions as Record<string, Record<string, unknown> | undefined>)[
    `/platforms/${tenantKey}/`
  ];
  return Boolean(flags?.[MANAGE_CRM_FLAG]);
}
