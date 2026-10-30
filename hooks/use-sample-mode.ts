"use client";

import { useMemo } from "react";
import { useSelector } from "react-redux";
import { usePathname } from "next/navigation";
import { selectRbacPermissions } from "@iblai/iblai-js/web-utils";
import { sampleSession } from "@/lib/crm/sample/mode";

/** Whether this page shows the community organization's sample data. */
export function useSampleMode(): boolean {
  const permissions = useSelector(selectRbacPermissions);
  const pathname = usePathname() ?? "";
  return useMemo(() => sampleSession(permissions, pathname), [permissions, pathname]);
}
