"use client";

import { usePathname } from "next/navigation";
import { sampleSession } from "@/lib/crm/sample/mode";

/** Whether this page shows the community organization's sample data. */
export function useSampleMode(): boolean {
  return sampleSession(usePathname() ?? "");
}
