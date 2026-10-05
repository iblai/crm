import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { errorMessage, errorStatus } from "@/lib/crm/api";

/** A 409's `protected_by: {deals: n}` — how many records still point at this one. */
function protectedCount(err: unknown): number {
  const data = (err as { data?: { protected_by?: Record<string, number> } } | null)?.data;
  return Object.values(data?.protected_by ?? {}).reduce((sum, n) => sum + n, 0);
}

/**
 * Toast an API failure the way the CRM talks about them: permission errors
 * read as permission errors, a protected delete says what still references
 * the record, everything else falls back to the API's detail.
 */
export function useToastApiError() {
  const tc = useTranslations("common");
  return (err: unknown, fallback?: string) => {
    if (errorStatus(err) === 403) {
      toast.error(tc("errorForbidden"));
      return;
    }
    const count = errorStatus(err) === 409 ? protectedCount(err) : 0;
    if (count > 0) {
      toast.error(tc("errorProtectedByDeals", { count }));
      return;
    }
    toast.error(errorMessage(err, fallback ?? tc("errorGeneric")));
  };
}
