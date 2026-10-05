"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { SimpleSelect } from "@/components/crm/simple-select";
import { useMemberLabel, useMembers } from "@/hooks/use-members";
import { useSession } from "@/hooks/use-session";

/**
 * Owner filter for list toolbars. Same directory as `OwnerSelect`, but the
 * empty option reads "Anyone" — in a filter, no owner means "don't filter",
 * not "unassigned".
 */
export function OwnerFilter({
  value,
  onChange,
  className,
}: {
  value: number | null;
  onChange: (owner: number | null) => void;
  className?: string;
}) {
  const t = useTranslations("deals");
  const tc = useTranslations("common");
  const { tenantKey, userId, displayName } = useSession();
  const { members } = useMembers(tenantKey);
  const memberLabel = useMemberLabel();

  const options = useMemo(() => {
    const opts = members.map((m) => ({ value: String(m.id), label: memberLabel(m) }));
    if (userId && !members.some((m) => m.id === userId)) {
      opts.unshift({
        value: String(userId),
        label: t("owner.self", { name: displayName || t("owner.me") }),
      });
    }
    return opts;
  }, [members, memberLabel, userId, displayName, t]);

  return (
    <SimpleSelect
      value={value ? String(value) : ""}
      onChange={(v) => onChange(v ? Number(v) : null)}
      options={options}
      allowEmpty
      emptyLabel={t("owner.anyone")}
      placeholder={t("owner.anyone")}
      size="sm"
      className={className}
      aria-label={tc("owner")}
    />
  );
}
