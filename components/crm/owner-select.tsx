"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { SimpleSelect } from "@/components/crm/simple-select";
import { useMemberLabel, useMembers } from "@/hooks/use-members";
import { useSession } from "@/hooks/use-session";

/**
 * Pick the platform user who owns a record. Lists the organization's members
 * when the directory is readable; always offers "me" so a member without
 * directory access can still claim ownership.
 */
export function OwnerSelect({
  value,
  onChange,
  size = "default",
  className,
  disabled,
  emptyLabel,
}: {
  value: number | null | undefined;
  onChange: (owner: number | null) => void;
  size?: "sm" | "default";
  className?: string;
  disabled?: boolean;
  /** Label for the empty choice — "Unassigned" on a record, "Anyone" in a filter. */
  emptyLabel?: string;
}) {
  const t = useTranslations("fields");
  const tc = useTranslations("common");
  const { tenantKey, userId, displayName } = useSession();
  const { members } = useMembers(tenantKey);
  const memberLabel = useMemberLabel();
  const empty = emptyLabel ?? t("owner.unassigned");

  const options = useMemo(() => {
    const opts = members.map((m) => ({ value: String(m.id), label: memberLabel(m) }));
    if (userId && !members.some((m) => m.id === userId)) {
      opts.unshift({
        value: String(userId),
        label: t("owner.meOption", { name: displayName || t("owner.me") }),
      });
    }
    if (value && !opts.some((o) => o.value === String(value))) {
      opts.push({ value: String(value), label: t("owner.user", { id: String(value) }) });
    }
    return opts;
  }, [members, memberLabel, userId, displayName, value, t]);

  return (
    <SimpleSelect
      value={value ? String(value) : ""}
      onChange={(v) => onChange(v ? Number(v) : null)}
      options={options}
      allowEmpty
      emptyLabel={empty}
      placeholder={empty}
      size={size}
      className={className}
      disabled={disabled}
      aria-label={tc("owner")}
    />
  );
}

/** Text label for an owner id, resolved through the member directory. */
export function OwnerName({ ownerId }: { ownerId?: number | null }) {
  const t = useTranslations("fields");
  const { tenantKey, userId, displayName } = useSession();
  const { byId } = useMembers(tenantKey);
  const memberLabel = useMemberLabel();
  if (!ownerId) return <span className="text-muted-foreground">{t("owner.unassigned")}</span>;
  const member = byId.get(ownerId);
  if (member) return <>{memberLabel(member)}</>;
  if (ownerId === userId) return <>{displayName || t("owner.me")}</>;
  return <>{t("owner.user", { id: String(ownerId) })}</>;
}
