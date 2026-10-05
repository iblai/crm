import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { errorMessage, errorStatus } from "@/lib/crm/api";

/**
 * Toast an API failure the way the CRM talks about them: permission errors
 * read as permission errors, everything else falls back to the API's detail.
 */
export function useToastApiError() {
  const tc = useTranslations("common");
  return (err: unknown, fallback?: string) => {
    if (errorStatus(err) === 403) {
      toast.error(tc("errorForbidden"));
      return;
    }
    toast.error(errorMessage(err, fallback ?? tc("errorGeneric")));
  };
}
