"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { toast } from "sonner";
import { useGetUserMetadataQuery } from "@iblai/iblai-js/data-layer";
import { useUserProfileUpdate } from "@iblai/iblai-js/web-utils";
import { LOCALE_LABELS, SUPPORTED_LOCALES } from "@/i18n/config";
import { syncLanguageCookies } from "@/lib/locale-cookie";
import { errorMessage } from "@/lib/crm/api";
import { useSession } from "@/hooks/use-session";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Language select in the top bar; saved to the profile, which every ibl.ai app follows. */
export function LanguageMenu({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("language");
  const tc = useTranslations("common");
  const { username } = useSession();
  const { updateProfile } = useUserProfileUpdate(username);
  const { data: userMetadata } = useGetUserMetadataQuery(
    { params: { username } },
    { skip: !username },
  );
  const choose = async (value: string) => {
    const next = syncLanguageCookies(value);
    router.refresh();
    if (!username) return;
    // The profile is the language of record (the OS re-applies it on load).
    const current = (userMetadata as { public_metadata?: Record<string, unknown> } | undefined)
      ?.public_metadata;
    try {
      await updateProfile({ public_metadata: { ...current, language: next } });
    } catch (err) {
      toast.error(errorMessage(err, tc("errorGeneric")));
    }
  };
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <label className={className}>
            <Languages className="size-4 text-[#5f5f61]" strokeWidth={1.75} aria-hidden />
            <span className="sr-only">{t("label")}</span>
            <select
              value={locale}
              onChange={(event) => void choose(event.target.value)}
              className="h-8 cursor-pointer rounded-md border border-transparent bg-transparent pr-1 text-xs text-[#4a5568] hover:bg-[#f0f4fa] focus-visible:border-[#0058cc] focus-visible:outline-none"
            >
              {SUPPORTED_LOCALES.map((code) => (
                <option key={code} value={code}>
                  {LOCALE_LABELS[code]}
                </option>
              ))}
            </select>
          </label>
        }
      />
      <TooltipContent side="bottom">{t("hint")}</TooltipContent>
    </Tooltip>
  );
}
