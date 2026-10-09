"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Building2,
  CalendarCheck2,
  Handshake,
  Home,
  Search,
  Settings,
  Tag,
  Users,
} from "lucide-react";
import {
  PlatformAccountSheet,
  PlatformSidebar,
  useSidebar,
  type PlatformAccountTab,
  type PlatformSidebarFooterActionId,
  type PlatformSidebarSectionConfig,
} from "@iblai/iblai-js/web-containers/next";
import { InviteUserDialog } from "@iblai/iblai-js/web-containers";
import { useAdminMode, useCanManageCrm } from "@/components/crm/admin-mode";
import { AdminModeSwitch } from "@/components/crm/admin-mode-switch";
import { useCommandPalette } from "@/components/crm/command-palette";
import { FavoritesSection } from "@/components/crm/favorites-section";
import { LanguageMenu } from "@/components/crm/language-menu";
import { NavRow } from "@/components/crm/nav-row";
import { useSession } from "@/hooks/use-session";
import config from "@/lib/iblai/config";
import { tenantDisplayName } from "@/lib/iblai/tenant";

/**
 * The SDK's cross-SPA sidebar shell with this app's content: Search as the
 * primary action, the CRM objects as flat rows, Settings for admins in Admin
 * mode and for CRM Managers, and the SDK footer cluster (Notifications, Invites, Management, …).
 */
export function AppSidebar() {
  const t = useTranslations("nav");
  const router = useRouter();
  const { tenantKey, username, email, isAdmin, currentTenant, href } = useSession();
  const { adminMode } = useAdminMode();
  const { isMobile, setOpenMobile } = useSidebar();
  const { open: openPalette } = useCommandPalette();
  const isLiveAdmin = isAdmin && adminMode;
  const canManage = useCanManageCrm();
  const [accountTab, setAccountTab] = useState<PlatformAccountTab | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const go = (path: string) => {
    router.push(href(path));
    if (isMobile) setOpenMobile(false);
  };

  const rows = [
    { id: "home", label: t("home"), path: "", icon: Home, exact: true },
    { id: "people", label: t("people"), path: "/people", icon: Users },
    { id: "organizations", label: t("organizations"), path: "/organizations", icon: Building2 },
    { id: "deals", label: t("deals"), path: "/deals", icon: Handshake },
    { id: "activities", label: t("activities"), path: "/activities", icon: CalendarCheck2 },
    { id: "tags", label: t("tags"), path: "/tags", icon: Tag },
  ];

  const sections: PlatformSidebarSectionConfig[] = [
    {
      type: "custom",
      id: "objects",
      render: (ctx) => (
        <div className="flex flex-col gap-0.5">
          {rows.map((row) => (
            <NavRow
              key={row.id}
              collapsed={ctx.collapsed}
              icon={row.icon}
              label={row.label}
              href={href(row.path)}
              exact={row.exact}
              onAfterNav={ctx.onAfterNav}
            />
          ))}
        </div>
      ),
    },
    {
      type: "custom",
      id: "favorites",
      render: (ctx) => (
        <FavoritesSection
          collapsed={ctx.collapsed}
          expandFromRail={ctx.expandFromRail}
          onAfterNav={ctx.onAfterNav}
        />
      ),
    },
  ];
  if (canManage) {
    sections.push({ type: "divider", id: "admin-divider" });
    sections.push({
      type: "custom",
      id: "admin",
      render: (ctx) => (
        <NavRow
          collapsed={ctx.collapsed}
          icon={Settings}
          label={t("settings")}
          href={href("/settings")}
          onAfterNav={ctx.onAfterNav}
        />
      ),
    });
  }

  // The top bar's switch and language menu are desktop-only; the sheet carries them on phones.
  if (isMobile) {
    sections.push({ type: "divider", id: "preferences-divider" });
    sections.push({
      type: "custom",
      id: "preferences",
      render: () => (
        <div className="flex items-center justify-between gap-3 px-2 py-1">
          <LanguageMenu className="flex items-center gap-1" />
          <AdminModeSwitch />
        </div>
      ),
    });
  }

  // The SDK closes the sheet only for its own navigation; dialogs opened from here must close it first.
  const onFooterAction = (id: PlatformSidebarFooterActionId) => {
    if (isMobile) setOpenMobile(false);
    if (id === "notifications") go("/notifications");
    else if (id === "management") go("/admin/users");
    else if (id === "invites") setInviteOpen(true);
    else setAccountTab(id);
  };

  return (
    <>
      <PlatformSidebar
        logo={
          <Link
            href={href()}
            aria-label={t("home")}
            onClick={() => isMobile && setOpenMobile(false)}
          >
            {/* The platform's logo; the DM serves ibl.ai's when the platform has none. */}
            <Image
              src={`${config.dmUrl()}/api/core/orgs/${encodeURIComponent(tenantKey)}/logo/`}
              alt={tenantDisplayName(currentTenant)}
              width={120}
              height={40}
              unoptimized
              className="h-8 w-auto max-w-full object-contain"
            />
          </Link>
        }
        primaryAction={{
          label: t("search"),
          icon: Search,
          onClick: () => {
            if (isMobile) setOpenMobile(false);
            openPalette();
          },
        }}
        sections={sections}
        footer={{
          isAdmin,
          isLiveAdmin,
          enableRbac: false,
          rbacPermissions: {},
          tenantKey,
          currentTenant: {
            key: tenantKey,
            enable_monetization: currentTenant?.enable_monetization ?? false,
          },
          notificationsAllowed: true,
          invitesUserTypeAllowed: true,
          supportUrl: config.documentationUrl(),
          onAction: onFooterAction,
        }}
      />
      <PlatformAccountSheet
        tab={accountTab}
        onClose={() => setAccountTab(null)}
        tenantKey={tenantKey}
        username={username}
        email={email}
        onInviteClick={() => setInviteOpen(true)}
        mainPlatformKey={config.mainTenantKey()}
        authUrl={config.authUrl()}
        currentSpa="crm"
        platformBaseDomain={config.platformBaseDomain()}
      />
      <InviteUserDialog
        tenant={tenantKey}
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />
    </>
  );
}
