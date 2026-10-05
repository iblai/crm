"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SidebarInset, SidebarProvider } from "@iblai/iblai-js/web-containers/next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/crm/app-sidebar";
import { TopBar } from "@/components/crm/top-bar";
import { BreadcrumbProvider } from "@/components/crm/breadcrumbs";
import { CommandPaletteProvider } from "@/components/crm/command-palette";
import { AdminModeProvider, useAdminMode } from "@/components/crm/admin-mode";
import { LoadingScreen } from "@/components/loading-screen";
import { useSession } from "@/hooks/use-session";

// The SDK sidebar remembers its desktop state in this cookie.
function readSidebarOpen(): boolean {
  if (typeof document === "undefined") return true;
  const match = /(?:^|;\s*)sidebar_state=(true|false)/.exec(document.cookie);
  return match ? match[1] === "true" : true;
}

/**
 * Everything under `/platform/[tenantKey]` — the authenticated, org-scoped
 * CRM shell: the SDK sidebar and inset around the top bar and the page. The
 * providers above us have already verified the session and the membership.
 */
export default function TenantLayout({ children }: { children: ReactNode }) {
  const { isAdmin, tenantKey } = useSession();
  const [sidebarOpen] = useState(readSidebarOpen);

  if (!tenantKey) return <LoadingScreen />;

  return (
    <AdminModeProvider isAdmin={isAdmin}>
      <TooltipProvider>
        <CommandPaletteProvider>
          <BreadcrumbProvider>
            <div className="flex h-dvh flex-col overflow-hidden bg-white">
              <SidebarProvider defaultOpen={sidebarOpen} className="min-h-0 flex-1">
                <AppSidebar />
                <SidebarInset
                  asChild
                  className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-[var(--sidebar-bg,#fafbfc)]"
                >
                  <div>
                    <TopBar />
                    <AdminGate>
                      <main
                        id="main-content"
                        className="flex min-h-0 flex-1 flex-col overflow-hidden"
                      >
                        {children}
                      </main>
                    </AdminGate>
                  </div>
                </SidebarInset>
              </SidebarProvider>
            </div>
          </BreadcrumbProvider>
        </CommandPaletteProvider>
      </TooltipProvider>
    </AdminModeProvider>
  );
}

/** `/settings` and `/admin/*` are admin-only, in Admin mode only. */
function AdminGate({ children }: { children: ReactNode }) {
  const { adminMode } = useAdminMode();
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { href } = useSession();
  const gated = /\/platform\/[^/]+\/(admin|settings)(\/|$)/.test(pathname);

  useEffect(() => {
    if (gated && !adminMode) router.replace(href());
  }, [gated, adminMode, router, href]);

  if (gated && !adminMode) return null;
  return <>{children}</>;
}
