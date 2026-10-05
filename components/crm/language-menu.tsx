"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { LOCALE_LABELS, SUPPORTED_LOCALES } from "@/i18n/config";
import { syncLanguageCookies } from "@/lib/locale-cookie";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Language select in the top bar; the choice is shared with the other ibl.ai apps. */
export function LanguageMenu({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("language");
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <label className={className}>
            <Languages className="size-4 text-[#5f5f61]" strokeWidth={1.75} aria-hidden />
            <span className="sr-only">{t("label")}</span>
            <select
              value={locale}
              onChange={(event) => {
                syncLanguageCookies(event.target.value);
                router.refresh();
              }}
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
