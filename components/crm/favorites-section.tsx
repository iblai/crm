"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import {
  PLATFORM_SIDEBAR_NAV_MUTED,
  PlatformSidebarCollapsedLabelFlyout,
} from "@iblai/iblai-js/web-containers/next";
import { EntityAvatar } from "@/components/crm/entity-avatar";
import { useSession } from "@/hooks/use-session";
import { useListFavoritesQuery } from "@/lib/crm/api";
import type { Favorite } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

const MAX_ROWS = 8;

function pathFor(favorite: Favorite) {
  if (favorite.target_type === "person") return `/people/${favorite.person}`;
  if (favorite.target_type === "organization") return `/organizations/${favorite.organization}`;
  return `/deals/${favorite.deal}`;
}

/**
 * The sidebar's Favorites: the user's newest stars as rows (Twenty's
 * Favorites section). Renders nothing until something is starred.
 */
export function FavoritesSection({
  collapsed,
  expandFromRail,
  onAfterNav,
}: {
  collapsed: boolean;
  expandFromRail: () => void;
  onAfterNav: () => void;
}) {
  const t = useTranslations("favorites");
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { href } = useSession();
  const { data } = useListFavoritesQuery();
  const favorites = (data?.results ?? []).slice(0, MAX_ROWS);
  if (favorites.length === 0) return null;

  if (collapsed) {
    return (
      <PlatformSidebarCollapsedLabelFlyout label={t("title")}>
        <button
          type="button"
          onClick={expandFromRail}
          aria-label={t("title")}
          className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[8px] hover:bg-[#f0f0f0]"
        >
          <Star
            className="size-4"
            style={{ color: PLATFORM_SIDEBAR_NAV_MUTED }}
            strokeWidth={1.5}
          />
        </button>
      </PlatformSidebarCollapsedLabelFlyout>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <p className="px-2 pt-1 pb-0.5 text-[11px] font-medium tracking-wide text-[#5f5f61] uppercase">
        {t("title")}
      </p>
      {favorites.map((favorite) => {
        const target = href(pathFor(favorite));
        const active = pathname === target || pathname.startsWith(`${target}/`);
        return (
          <button
            key={favorite.id}
            type="button"
            onClick={() => {
              router.push(target);
              onAfterNav();
            }}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-8 w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 text-left text-[13px] transition-colors",
              active ? "bg-[#eef6fc] text-[#1e40af]" : "text-[#5f5f61] hover:bg-[#f4f4f4]",
            )}
          >
            <EntityAvatar
              name={favorite.label}
              seed={favorite.person ?? favorite.organization ?? favorite.deal}
              kind={favorite.target_type}
              size="xs"
            />
            <span className="min-w-0 flex-1 truncate">{favorite.label}</span>
          </button>
        );
      })}
    </div>
  );
}
