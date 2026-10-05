"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { EntityAvatar } from "@/components/crm/entity-avatar";
import { LifecycleBadge } from "@/components/crm/badges";
import { OwnerName } from "@/components/crm/owner-select";
import { TagList } from "@/components/crm/tag-chip";
import { useSession } from "@/hooks/use-session";
import { formatDate } from "@/lib/crm/format";
import type { Person } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

export type PersonColumn = "organization" | "job_title" | "owner" | "tags" | "created";

const ALL_COLUMNS: PersonColumn[] = ["organization", "job_title", "owner", "tags", "created"];

const th =
  "h-9 whitespace-nowrap px-4 text-left text-xs font-medium tracking-wide text-muted-foreground";
const td = "px-4 py-2 align-middle";

/**
 * The people grid — Twenty's compact table. Name and lifecycle are always
 * shown; the rest of the columns are opt-in so the same table serves the
 * People page and an organization's People tab. Whole rows are clickable.
 */
export function PeopleTable({
  persons,
  isLoading,
  columns = ALL_COLUMNS,
  skeletonRows = 8,
  className,
}: {
  persons: Person[];
  isLoading?: boolean;
  columns?: PersonColumn[];
  skeletonRows?: number;
  className?: string;
}) {
  const t = useTranslations("people");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const { href } = useSession();
  const headings: Record<PersonColumn, string> = {
    organization: t("fields.organization"),
    job_title: t("fields.jobTitle"),
    owner: tc("owner"),
    tags: tc("tags"),
    created: tc("created"),
  };
  const shown = ALL_COLUMNS.filter((c) => columns.includes(c));
  const colCount = shown.length + 2;

  return (
    <table
      className={cn("w-full min-w-[44rem] border-separate border-spacing-0 text-sm", className)}
    >
      <thead className="sticky top-0 z-10 bg-white">
        <tr>
          <th scope="col" className={cn(th, "border-b border-[var(--border-color,#e5e7eb)]")}>
            {tc("name")}
          </th>
          <th scope="col" className={cn(th, "border-b border-[var(--border-color,#e5e7eb)]")}>
            {t("fields.lifecycle")}
          </th>
          {shown.map((c) => (
            <th
              key={c}
              scope="col"
              className={cn(th, "border-b border-[var(--border-color,#e5e7eb)]")}
            >
              {headings[c]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {isLoading
          ? Array.from({ length: skeletonRows }, (_, i) => (
              <tr key={`sk-${i}`} className="border-b border-gray-100">
                <td className={cn(td, "border-b border-gray-100")}>
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="size-8 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-2.5 w-40" />
                    </div>
                  </div>
                </td>
                {Array.from({ length: colCount - 1 }, (_, j) => (
                  <td key={j} className={cn(td, "border-b border-gray-100")}>
                    <Skeleton className="h-3 w-20" />
                  </td>
                ))}
              </tr>
            ))
          : persons.map((p) => {
              const orgName = p.organization_name ?? undefined;
              return (
                <tr
                  key={p.id}
                  onClick={() => router.push(href(`/people/${p.id}`))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") router.push(href(`/people/${p.id}`));
                  }}
                  tabIndex={0}
                  className="cursor-pointer transition-colors outline-none hover:bg-gray-50 focus-visible:bg-gray-50"
                >
                  <td className={cn(td, "border-b border-gray-100")}>
                    <div className="flex items-center gap-2.5">
                      <EntityAvatar name={p.name} seed={p.id} kind="person" />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-gray-900">{p.name}</div>
                        {p.primary_email ? (
                          <div className="text-muted-foreground truncate text-xs">
                            {p.primary_email}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className={cn(td, "border-b border-gray-100")}>
                    <LifecycleBadge stage={p.lifecycle_stage} />
                  </td>
                  {shown.map((c) => (
                    <td key={c} className={cn(td, "border-b border-gray-100")}>
                      {c === "organization" ? (
                        p.organization ? (
                          <Link
                            href={href(`/organizations/${p.organization}`)}
                            onClick={(e) => e.stopPropagation()}
                            className="truncate text-[#0058cc] hover:underline"
                          >
                            {orgName ?? t("table.viewOrganization")}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )
                      ) : null}
                      {c === "job_title" ? (
                        <span className="text-gray-700">{p.job_title || "—"}</span>
                      ) : null}
                      {c === "owner" ? (
                        <span className="text-gray-700">
                          <OwnerName ownerId={p.owner} />
                        </span>
                      ) : null}
                      {c === "tags" ? (
                        p.tags?.length ? (
                          <TagList tags={p.tags} max={2} size="xs" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )
                      ) : null}
                      {c === "created" ? (
                        <span className="text-muted-foreground">
                          {formatDate(p.created_at, locale)}
                        </span>
                      ) : null}
                    </td>
                  ))}
                </tr>
              );
            })}
      </tbody>
    </table>
  );
}
