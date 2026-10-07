"use client";

import { useTranslations } from "next-intl";
import { NOTICE_PRIMARY, NOTICE_SECONDARY, NoticeCard } from "@/components/notice-card";
import { createOrganizationUrl } from "@/lib/iblai/auth-redirect";
import { handleLogout } from "@/lib/iblai/auth-utils";
import { readUserEmail } from "@/lib/iblai/tenant";

/**
 * Where a cancelled registration lands. Public: a user without an organization
 * of their own must not be sent straight back to the checkout from here.
 */
export default function JoinPage() {
  const t = useTranslations("join");
  return (
    <NoticeCard title={t("title")} body={t("body")}>
      <button type="button" onClick={() => handleLogout()} className={NOTICE_SECONDARY}>
        {t("signOut")}
      </button>
      <button
        type="button"
        onClick={() =>
          window.location.assign(createOrganizationUrl(window.location.origin, readUserEmail()))
        }
        className={NOTICE_PRIMARY}
      >
        {t("create")}
      </button>
    </NoticeCard>
  );
}
