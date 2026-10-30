"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Menu, PanelLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { NotificationDropdown } from "@iblai/iblai-js/web-containers";
import { useSidebar } from "@iblai/iblai-js/web-containers/next";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserMenu } from "@/components/crm/user-menu";
import { AdminModeSwitch } from "@/components/crm/admin-mode-switch";
import { useAdminMode } from "@/components/crm/admin-mode";
import { CreditBadge } from "@/components/house/credit-badge";
import { LanguageMenu } from "@/components/crm/language-menu";
import { Breadcrumbs } from "@/components/crm/breadcrumbs";
import { useSession } from "@/hooks/use-session";

/**
 * The top bar — the OS's navbar shape (h-16, white, `#D0E0FF` hairline):
 * sidebar toggle + breadcrumbs on the left; the credit badge, Admin switch,
 * the SDK notification bell and the SDK profile dropdown on the right.
 */
export function TopBar() {
  const t = useTranslations("shell");
  const router = useRouter();
  const { tenantKey, username, isAdmin, href } = useSession();
  const { adminMode } = useAdminMode();
  const { toggleSidebar, isMobile } = useSidebar();

  const handleViewNotifications = useCallback(
    (notificationId?: string) => {
      router.push(href(`/notifications/${notificationId ?? ""}`));
    },
    [router, href],
  );

  return (
    <header className="z-10 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[#D0E0FF] bg-white pr-3 pl-2 md:h-16 md:pr-4">
      <div className="flex min-w-0 items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer text-[#5f5f61]"
                onClick={toggleSidebar}
                aria-label={t("toggleSidebar")}
              />
            }
          >
            {isMobile ? <Menu className="size-5" /> : <PanelLeft className="size-5" />}
          </TooltipTrigger>
          <TooltipContent side="bottom">{t("toggleSidebarHint")}</TooltipContent>
        </Tooltip>
        <Breadcrumbs />
      </div>
      <div className="flex items-center gap-3 md:gap-5">
        <CreditBadge
          org={tenantKey}
          isLiveAdmin={isAdmin && adminMode}
          className="hidden md:flex"
        />
        <AdminModeSwitch className="hidden md:flex" />
        <LanguageMenu className="hidden items-center gap-1 md:flex" />
        {tenantKey && username ? (
          <NotificationDropdown
            org={tenantKey}
            userId={username}
            isAdmin={isAdmin}
            onViewNotifications={handleViewNotifications}
          />
        ) : null}
        <UserMenu />
      </div>
    </header>
  );
}
