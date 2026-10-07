"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LoadingScreen } from "@/components/loading-screen";
import { NOTICE_PRIMARY, NoticeCard } from "@/components/notice-card";
import { createOrganizationUrl } from "@/lib/iblai/auth-redirect";
import { isLoggedIn, redirectToAuthSpa } from "@/lib/iblai/auth-utils";
import { resolveDefaultTenant, tenantHref } from "@/lib/iblai/tenant";

/**
 * `/` names no organization. A signed-in user goes to their org's CRM home
 * (`/platform/<org>`); a visitor gets the start page — Sign up (registration,
 * which brings them back here) and Log in.
 */
export default function RootPage() {
  const router = useRouter();
  const t = useTranslations("start");
  const [signedIn] = useState(() => isLoggedIn());
  useEffect(() => {
    if (signedIn) router.replace(tenantHref(resolveDefaultTenant()));
  }, [signedIn, router]);
  if (signedIn) return <LoadingScreen />;
  return (
    <NoticeCard title={t("title")} body={t("body")} stacked>
      <button
        type="button"
        onClick={() => window.location.assign(createOrganizationUrl(window.location.origin))}
        className={NOTICE_PRIMARY}
      >
        {t("signUp")}
      </button>
      <button
        type="button"
        onClick={() => void redirectToAuthSpa(undefined, undefined, false, true, true)}
        className="text-muted-foreground text-sm hover:underline"
      >
        {t("logIn")}
      </button>
    </NoticeCard>
  );
}
