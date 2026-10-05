import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { errorMessage, errorStatus } from "@/lib/crm/api";

/** `New Business Pipeline` → `new-business-pipeline`. */
export function slugify(value: string, max = 50): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, max)
    .replace(/-+$/, "");
}

/**
 * Only CRM Managers (org admins) may change pipelines, stages and lead
 * sources — say so plainly instead of leaking the API's 403 body.
 */
export function useToastSettingsError() {
  const tc = useTranslations("common");
  return (err: unknown) => {
    toast.error(
      errorStatus(err) === 403 ? tc("errorForbidden") : errorMessage(err, tc("errorGeneric")),
    );
  };
}
