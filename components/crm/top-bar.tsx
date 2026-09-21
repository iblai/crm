"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Menu, PanelLeft } from "lucide-react";
import { NotificationDropdown } from "@iblai/iblai-js/web-containers";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { UserMenu } from "@/components/crm/user-menu";
import { AdminModeSwitch } from "@/components/crm/admin-mode-switch";
import { Breadcrumbs } from "@/components/crm/breadcrumbs";
import { useSession } from "@/hooks/use-session";

/**
 * The top bar — the OS's navbar shape (h-16, white, `#D0E0FF` hairline):
 * sidebar toggle + breadcrumbs on the left; Admin switch, the SDK
 * notification bell and the SDK profile dropdown on the right.
 */
export function TopBar() {
  const router = useRouter();
  const { tenantKey, username, isAdmin, href } = useSession();
  const { toggleSidebar, isMobile } = useSidebar();

  const handleViewNotifications = useCallback(
    (notificationId?: string) => {
      router.push(href(`/notifications/${notificationId ?? ""}`));
    },
    [router, href],
  );

  return (
    <header className="z-10 flex h-14 shrink-0 items-center justify-between border-b border-[#D0E0FF] bg-white pr-3 pl-2 md:h-16 md:pr-4">
      <div className="flex min-w-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="cursor-pointer text-[#5f5f61]"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          {isMobile ? <Menu className="size-5" /> : <PanelLeft className="size-5" />}
        </Button>
        <Breadcrumbs />
      </div>
      <div className="flex items-center gap-3 md:gap-5">
        <AdminModeSwitch className="hidden md:flex" />
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
