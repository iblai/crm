"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useSelector } from "react-redux";
import { selectRbacPermissions } from "@iblai/iblai-js/web-utils";
import { useSession } from "@/hooks/use-session";
import { canManageCrm } from "@/lib/crm/permissions";

/**
 * Org admins can view the CRM exactly as a member sees it (the OS's User /
 * Admin switch). View preference only — anything that must stay admin-only
 * regardless of the switch keys on `useSession().isAdmin`.
 */
type AdminMode = {
  isAdmin: boolean;
  adminMode: boolean;
  setAdminMode: (on: boolean) => void;
};

const AdminModeContext = createContext<AdminMode>({
  isAdmin: false,
  adminMode: false,
  setAdminMode: () => {},
});

export function AdminModeProvider({
  isAdmin,
  children,
}: {
  isAdmin: boolean;
  children: ReactNode;
}) {
  const [mode, setMode] = useState(true);
  return (
    <AdminModeContext.Provider
      value={{ isAdmin, adminMode: isAdmin && mode, setAdminMode: setMode }}
    >
      {children}
    </AdminModeContext.Provider>
  );
}

export function useAdminMode() {
  return useContext(AdminModeContext);
}

/** Settings access: Admin mode, or the CRM Manager role. */
export function useCanManageCrm() {
  const { adminMode } = useAdminMode();
  const { tenantKey } = useSession();
  const permissions = useSelector(selectRbacPermissions);
  return canManageCrm(permissions, tenantKey, adminMode);
}
