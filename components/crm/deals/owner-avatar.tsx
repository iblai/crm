"use client";

import { useTranslations } from "next-intl";
import { EntityAvatar } from "@/components/crm/entity-avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMemberLabel, useMembers } from "@/hooks/use-members";
import { useSession } from "@/hooks/use-session";

/** Resolve an owner id to a display name through the member directory. */
export function useOwnerLabel() {
  const t = useTranslations("deals");
  const { tenantKey, userId, displayName } = useSession();
  const { byId } = useMembers(tenantKey);
  const memberLabel = useMemberLabel();
  return (ownerId?: number | null) => {
    if (!ownerId) return t("owner.unassigned");
    const member = byId.get(ownerId);
    if (!member && ownerId === userId) return displayName || t("owner.me");
    return memberLabel(member, ownerId);
  };
}

/** Small initials avatar for the platform user who owns a record. */
export function OwnerAvatar({
  ownerId,
  size = "xs",
}: {
  ownerId?: number | null;
  size?: "xs" | "sm" | "md";
}) {
  const t = useTranslations("deals");
  const label = useOwnerLabel()(ownerId);
  if (!ownerId) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="flex size-5 items-center justify-center rounded-full border border-dashed border-gray-300 text-[9px] text-gray-400" />
          }
        >
          ?
        </TooltipTrigger>
        <TooltipContent>{t("owner.unassigned")}</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>
        <EntityAvatar name={label} seed={ownerId} size={size} />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
