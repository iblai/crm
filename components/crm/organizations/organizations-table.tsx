"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { EntityAvatar } from "@/components/crm/entity-avatar";
import { OwnerName } from "@/components/crm/owner-select";
import { TagList } from "@/components/crm/tag-chip";
import { useSession } from "@/hooks/use-session";
import { formatDate } from "@/lib/crm/format";
import type { Address, Organization } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

const th =
  "h-9 whitespace-nowrap px-4 text-left text-xs font-medium tracking-wide text-muted-foreground border-b border-[var(--border-color,#e5e7eb)]";
const td = "border-b border-gray-100 px-4 py-2 align-middle";

/** "City, Country" — the one-line location we show in the grid. */
export function locationLabel(address?: Address) {
  const parts = [address?.city, address?.country].filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  );
  return parts.join(", ");
}

/** The organizations grid — compact rows, whole row opens the record. */
export function OrganizationsTable({
  organizations,
  isLoading,
  skeletonRows = 8,
}: {
  organizations: Organization[];
  isLoading?: boolean;
  skeletonRows?: number;
}) {
  const t = useTranslations("companies");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const { href } = useSession();
  const headings = [tc("name"), t("table.location"), tc("owner"), tc("tags"), tc("created")];

  return (
    <table className="w-full min-w-[48rem] border-separate border-spacing-0 text-sm">
      <thead className="sticky top-0 z-10 bg-white">
        <tr>
          {headings.map((h) => (
            <th key={h} scope="col" className={th}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {isLoading
          ? Array.from({ length: skeletonRows }, (_, i) => (
              <tr key={`sk-${i}`}>
                <td className={td}>
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="size-8 rounded-md" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </td>
                {[0, 1, 2, 3].map((j) => (
                  <td key={j} className={td}>
                    <Skeleton className="h-3 w-24" />
                  </td>
                ))}
              </tr>
            ))
          : organizations.map((o) => {
              const location = locationLabel(o.address);
              return (
                <tr
                  key={o.id}
                  onClick={() => router.push(href(`/companies/${o.id}`))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") router.push(href(`/companies/${o.id}`));
                  }}
                  tabIndex={0}
                  className="cursor-pointer transition-colors outline-none hover:bg-gray-50 focus-visible:bg-gray-50"
                >
                  <td className={td}>
                    <div className="flex items-center gap-2.5">
                      <EntityAvatar name={o.name} seed={o.id} kind="organization" />
                      <span className="truncate font-medium text-gray-900">{o.name}</span>
                    </div>
                  </td>
                  <td className={cn(td, location ? "text-gray-700" : "text-muted-foreground")}>
                    {location || "—"}
                  </td>
                  <td className={`${td} text-gray-700`}>
                    <OwnerName ownerId={o.owner} />
                  </td>
                  <td className={td}>
                    {o.tags?.length ? (
                      <TagList tags={o.tags} max={2} size="xs" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className={`${td} text-muted-foreground`}>
                    {formatDate(o.created_at, locale)}
                  </td>
                </tr>
              );
            })}
      </tbody>
    </table>
  );
}
