"use client";

import { useMemo } from "react";
import {
  useListActivitiesQuery,
  useListDealsQuery,
  useListPersonsQuery,
  useOverviewQuery,
} from "@/lib/crm/api";
import config from "@/lib/iblai/config";

/** `month` reads the overview's this-month figures; the others send a `date_filter`. */
export const DASHBOARD_PERIODS = ["month", "today", "7d", "30d", "90d"] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

/** `YYYY-MM` → the local first of that month (`new Date("2026-10")` is UTC midnight). */
function monthStart(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, 1);
}

/** Everything the home dashboard shows: `/overview/` plus three five-row lists. */
export function useDashboardData(period: DashboardPeriod, locale: string) {
  const overview = useOverviewQuery(period === "month" ? {} : { date_filter: period });
  const people = useListPersonsQuery({ active: true, ordering: "-created_at", page_size: 5 });
  const deals = useListDealsQuery({ ordering: "-created_at", page_size: 5 });
  const upNext = useListActivitiesQuery({
    is_done: false,
    ordering: "schedule_from",
    page_size: 6,
  });

  const data = overview.currentData;
  const dealStats = data?.deals;
  const currency = dealStats?.currency || config.defaultCurrency();

  const stageBreakdown = useMemo(
    () =>
      (dealStats?.by_stage ?? [])
        .filter((s) => !s.stage.is_won && !s.stage.is_lost)
        .map((s) => ({ name: s.stage.name, count: s.count, value: Number(s.total_value) })),
    [dealStats],
  );

  const wonLostByMonth = useMemo(() => {
    const label = new Intl.DateTimeFormat(locale, { month: "short" });
    return (dealStats?.won_lost_by_month ?? []).map((m) => ({
      key: m.month,
      label: label.format(monthStart(m.month)),
      won: m.won_count,
      lost: m.lost_count,
      wonValue: Number(m.won_value),
      lostValue: Number(m.lost_value),
    }));
  }, [dealStats, locale]);

  const won =
    period === "month"
      ? dealStats && {
          count: dealStats.won_this_month_count,
          value: Number(dealStats.won_this_month_value),
        }
      : data?.period_deals_won !== undefined
        ? { count: data.period_deals_won, value: Number(data.period_deals_won_value ?? 0) }
        : undefined;

  return {
    overview: data,
    error: overview.error,
    isLoading: overview.isLoading || (overview.isFetching && !overview.currentData),
    errors: { people: people.error, deals: deals.error, upNext: upNext.error },
    isFetching: overview.isFetching,
    currency,
    won,
    stageBreakdown,
    wonLostByMonth,
    recentPeople: people.data?.results ?? [],
    recentDeals: deals.data?.results ?? [],
    upNext: upNext.data?.results ?? [],
    isEmptyOrg:
      data?.persons?.count === 0 && data.organizations?.count === 0 && data.deals?.open_count === 0,
  };
}
