import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { errorMessage, errorStatus } from "@/lib/crm/api";
import { protectedCount } from "@/lib/crm/errors";

/**
 * Toast an API failure the way the CRM talks about them: permission errors
 * read as permission errors, a protected delete says what still references
 * the record, a dead connection says so, everything else falls back to the
 * API's detail.
 */
export function useToastApiError() {
  const tc = useTranslations("common");
  return (err: unknown, fallback?: string) => {
    const status = errorStatus(err);
    if (status === 403) {
      toast.error(tc("errorForbidden"));
      return;
    }
    if (status === "FETCH_ERROR") {
      toast.error(tc("errorNetwork"));
      return;
    }
    const count = status === 409 ? protectedCount(err) : 0;
    if (count > 0) {
      toast.error(tc("errorProtectedByDeals", { count }));
      return;
    }
    toast.error(errorMessage(err, fallback ?? tc("errorGeneric")));
  };
}
