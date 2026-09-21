"use client";

import { Check, ChevronsUpDown, ExternalLink, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { EntityAvatar } from "@/components/crm/entity-avatar";
import { useSession } from "@/hooks/use-session";
import { handleTenantSwitch } from "@/lib/iblai/auth-utils";
import { tenantDisplayName } from "@/lib/iblai/tenant";
import config from "@/lib/iblai/config";
import { cn } from "@/lib/utils";

/**
 * The organization switcher at the top of the sidebar — every org the user
 * belongs to (the whole set of tenants, exactly like os.ibl.ai). Switching
 * re-authenticates against the new org through the Auth SPA and lands on
 * `/platform/<org>`.
 */
export function OrgSwitcher({ collapsed }: { collapsed?: boolean }) {
  const { tenantKey, tenants, currentTenant } = useSession();
  const name = tenantDisplayName(currentTenant) || tenantKey;
  const others = tenants.filter((t) => t.key !== tenantKey);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton
            size="lg"
            className={cn(
              "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
              collapsed && "justify-center",
            )}
            aria-label="Switch organization"
          />
        }
      >
        <EntityAvatar name={name} seed={tenantKey} kind="organization" size="md" />
        {!collapsed ? (
          <>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold text-gray-900">{name}</span>
              <span className="text-muted-foreground truncate text-[11px]">
                {currentTenant?.is_admin ? "Admin" : "Member"} · {tenantKey}
              </span>
            </div>
            <ChevronsUpDown className="text-muted-foreground ml-auto size-4" />
          </>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[--anchor-width] min-w-64 rounded-xl"
        align="start"
        side="bottom"
        sideOffset={6}
      >
        <DropdownMenuLabel className="text-muted-foreground text-xs">
          Organizations
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem className="gap-2 p-2" disabled>
            <EntityAvatar name={name} seed={tenantKey} kind="organization" size="sm" />
            <span className="flex-1 truncate font-medium text-gray-900">{name}</span>
            <Check className="size-4 text-[#0058cc]" />
          </DropdownMenuItem>
          {others.map((t) => (
            <DropdownMenuItem
              key={t.key}
              className="gap-2 p-2"
              onClick={() => void handleTenantSwitch(t.key)}
            >
              <EntityAvatar
                name={tenantDisplayName(t)}
                seed={t.key}
                kind="organization"
                size="sm"
              />
              <span className="flex-1 truncate">{tenantDisplayName(t)}</span>
              {t.is_admin ? (
                <span className="rounded-full bg-gray-100 px-1.5 text-[10px] font-medium text-gray-600">
                  admin
                </span>
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-muted-foreground gap-2 p-2"
          onClick={() =>
            window.open(`${config.osUrl()}/platform/${tenantKey}`, "_blank", "noopener")
          }
        >
          <ExternalLink className="size-4" />
          Open in Agentic OS
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-muted-foreground gap-2 p-2"
          onClick={() => window.open("https://ibl.ai/join", "_blank", "noopener")}
        >
          <Plus className="size-4" />
          Create an organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
