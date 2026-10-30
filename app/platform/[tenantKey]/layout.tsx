"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SidebarInset, SidebarProvider } from "@iblai/iblai-js/web-containers/next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AccountSheetProvider } from "@/components/crm/account-sheet";
import { AppSidebar } from "@/components/crm/app-sidebar";
import { TopBar } from "@/components/crm/top-bar";
import { BreadcrumbProvider } from "@/components/crm/breadcrumbs";
import { CommandPaletteProvider } from "@/components/crm/command-palette";
import { AdminModeProvider, useCanManageCrm } from "@/components/crm/admin-mode";
import { LanguagePreferenceSync } from "@/components/language-preference-sync";
import { LoadingScreen } from "@/components/loading-screen";
import { FirstRunGate } from "@/components/house/first-run-gate";
import { OrganizationPreview } from "@/components/house/organization-preview";
import { SampleNotice } from "@/components/house/sample-notice";
import { UpgradeModal } from "@/components/house/upgrade-modal";
import { useSampleMode } from "@/hooks/use-sample-mode";
import { useSession } from "@/hooks/use-session";
import config from "@/lib/iblai/config";
import { readStoredTenantKey } from "@/lib/iblai/tenant";
import { decideEntry } from "@/lib/iblai/house-journeys";

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
 * An organization the user does not belong to is previewed (/iblai-vibe-house-journeys).
 */
export default function TenantLayout({ children }: { children: ReactNode }) {
  const { isAdmin, tenantKey, tenants, href } = useSession();
  const [sidebarOpen] = useState(readSidebarOpen);
  const sample = useSampleMode();

  if (!tenantKey) return <LoadingScreen />;
  const entry = decideEntry({ routeOrg: tenantKey, stored: readStoredTenantKey(), tenants });
  if (entry.kind === "preview" && entry.preview) {
    return <OrganizationPreview org={entry.preview} app={config.iblPlatform()} />;
  }

  // The community organization shows the sample to everyone as its admin; the SDK
  // (sidebar footer, profile menu, first run) still sees the session's own role.
  return (
    <AdminModeProvider isAdmin={isAdmin || sample} tenantKey={tenantKey}>
      <LanguagePreferenceSync />
      <UpgradeModal org={tenantKey} app={config.iblPlatform()} />
      <TooltipProvider>
        <AccountSheetProvider>
          <CommandPaletteProvider>
            <BreadcrumbProvider>
              <div className="flex min-h-dvh flex-col bg-white md:h-dvh md:overflow-hidden">
                <SidebarProvider defaultOpen={sidebarOpen} className="min-h-0 flex-1">
                  <AppSidebar />
                  <SidebarInset
                    asChild
                    className="flex min-h-0 w-full flex-1 flex-col bg-[var(--sidebar-bg,#fafbfc)] md:overflow-hidden"
                  >
                    <div>
                      <TopBar />
                      {sample ? <SampleNotice /> : null}
                      <AdminGate>
                        <main
                          id="main-content"
                          className="flex min-h-0 flex-1 flex-col md:overflow-hidden"
                        >
                          <FirstRunGate
                            org={tenantKey}
                            isAdmin={isAdmin}
                            onboardingPath={href("/onboarding")}
                          >
                            {children}
                          </FirstRunGate>
                        </main>
                      </AdminGate>
                    </div>
                  </SidebarInset>
                </SidebarProvider>
              </div>
            </BreadcrumbProvider>
          </CommandPaletteProvider>
        </AccountSheetProvider>
      </TooltipProvider>
    </AdminModeProvider>
  );
}

/** `/settings` opens to org admins in Admin mode and to CRM Managers. */
function AdminGate({ children }: { children: ReactNode }) {
  const canManage = useCanManageCrm();
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { href } = useSession();
  const allowed = /\/platform\/[^/]+\/settings(\/|$)/.test(pathname) ? canManage : true;

  useEffect(() => {
    if (!allowed) router.replace(href());
  }, [allowed, router, href]);

  if (!allowed) return null;
  return <>{children}</>;
}
