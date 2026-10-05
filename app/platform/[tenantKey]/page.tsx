"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarClock,
  CalendarPlus,
  Gauge,
  Handshake,
  Home,
  Trophy,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PageHeader } from "@/components/crm/page-header";
import { SimpleSelect } from "@/components/crm/simple-select";
import { StatCard } from "@/components/crm/stat-card";
import { Panel } from "@/components/crm/dashboard/panel";
import { LoadError } from "@/components/crm/load-error";
import { DealsByStageChart } from "@/components/crm/dashboard/deals-by-stage-chart";
import { WonLostChart } from "@/components/crm/dashboard/won-lost-chart";
import { UpNextList } from "@/components/crm/dashboard/up-next-list";
import { RecentDealsList, RecentPeopleList } from "@/components/crm/dashboard/recent-lists";
import { OnboardingCard } from "@/components/crm/dashboard/onboarding-card";
import {
  DASHBOARD_PERIODS,
  useDashboardData,
  type DashboardPeriod,
} from "@/components/crm/dashboard/use-dashboard-data";
import { useSession } from "@/hooks/use-session";
import { formatCompactCurrency, formatCurrency } from "@/lib/crm/format";

export default function HomePage() {
  const t = useTranslations("dashboard");
  const tp = useTranslations("people");
  const tn = useTranslations("nav");
  const locale = useLocale();
  const { displayName, href } = useSession();
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const data = useDashboardData(period, locale);
  const deals = data.overview?.deals;
  const money = (value: string | number | undefined, compact = false) =>
    value === undefined
      ? "—"
      : (compact ? formatCompactCurrency : formatCurrency)(Number(value), data.currency, locale);

  return (
    <>
      <PageHeader
        icon={<Home />}
        title={tn("home")}
        description={displayName ? t("welcomeNamed", { name: displayName }) : t("welcome")}
        actions={
          <>
            <SimpleSelect
              value={period}
              onChange={(v) => setPeriod(v as DashboardPeriod)}
              options={DASHBOARD_PERIODS.map((p) => ({ value: p, label: t(`period.${p}`) }))}
              size="sm"
              className="w-40"
              aria-label={t("period.label")}
            />
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={href("/people?new=1")} />}
                  />
                }
              >
                <UserPlus data-icon="inline-start" /> {tp("actions.new")}
              </TooltipTrigger>
              <TooltipContent side="bottom">{tp("actions.newHint")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={href("/activities?new=1")} />}
                  />
                }
              >
                <CalendarPlus data-icon="inline-start" /> {t("actions.logActivity")}
              </TooltipTrigger>
              <TooltipContent side="bottom">{t("actions.logActivityHint")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="sm"
                    className="ibl-button-primary"
                    render={<Link href={href("/deals?new=1")} />}
                  />
                }
              >
                <Handshake data-icon="inline-start" /> {t("actions.newDeal")}
              </TooltipTrigger>
              <TooltipContent side="bottom">{t("actions.newDealHint")}</TooltipContent>
            </Tooltip>
          </>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-7xl space-y-4 p-4 md:p-6">
          {data.error ? (
            <LoadError error={data.error} />
          ) : data.isEmptyOrg ? (
            <OnboardingCard />
          ) : (
            <>
              {/* ------------------------------------------------- stats */}
              {data.isLoading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  {Array.from({ length: 6 }, (_, i) => (
                    <Skeleton key={i} className="h-24 rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  <StatCard
                    label={t("stats.openDeals.label")}
                    labelText={t("stats.openDeals.labelText")}
                    value={deals?.open_count ?? "—"}
                    hint={t("stats.openDeals.hint")}
                    info={t("stats.openDeals.info")}
                    icon={<Handshake />}
                    tone="brand"
                  />
                  <StatCard
                    label={t("stats.pipelineValue.label")}
                    labelText={t("stats.pipelineValue.labelText")}
                    value={money(deals?.pipeline_value, true)}
                    hint={money(deals?.pipeline_value)}
                    info={t("stats.pipelineValue.info")}
                    icon={<Wallet />}
                    tone="brand"
                  />
                  <StatCard
                    label={t("stats.weighted.label")}
                    labelText={t("stats.weighted.labelText")}
                    value={money(deals?.weighted_value, true)}
                    hint={t("stats.weighted.hint")}
                    info={t("stats.weighted.info")}
                    icon={<Gauge />}
                  />
                  <StatCard
                    label={t("stats.won.label", { period: t(`period.${period}`) })}
                    labelText={t("stats.won.labelText", { period: t(`period.${period}`) })}
                    value={data.won?.count ?? "—"}
                    hint={money(data.won?.value)}
                    info={t("stats.won.info")}
                    icon={<Trophy />}
                    tone="success"
                  />
                  <StatCard
                    label={t("stats.people.label")}
                    labelText={t("stats.people.labelText")}
                    value={data.overview?.persons?.count ?? "—"}
                    hint={t("stats.people.hint")}
                    info={t("stats.people.info")}
                    icon={<Users />}
                  />
                  <StatCard
                    label={t("stats.dueToday.label")}
                    labelText={t("stats.dueToday.labelText")}
                    value={data.overview?.activities?.due_today ?? "—"}
                    hint={t("stats.dueToday.hint", {
                      count: data.overview?.activities?.overdue ?? 0,
                    })}
                    info={t("stats.dueToday.info")}
                    icon={<CalendarClock />}
                    tone={(data.overview?.activities?.overdue ?? 0) > 0 ? "warning" : "default"}
                  />
                </div>
              )}

              {/* ------------------------------------------------ charts */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Panel
                  title={t("panels.byStage.title")}
                  titleText={t("panels.byStage.titleText")}
                  info={t("panels.byStage.info")}
                  description={
                    deals && deals.pipeline === null
                      ? t("panels.byStage.noPipeline")
                      : (deals?.pipeline?.name ?? t("panels.byStage.defaultPipeline"))
                  }
                  href={href("/deals")}
                  linkLabel={t("panels.byStage.link")}
                >
                  <DealsByStageChart data={data.stageBreakdown} currency={data.currency} />
                </Panel>
                <Panel
                  title={t("panels.wonLost.title")}
                  titleText={t("panels.wonLost.titleText")}
                  info={t("panels.wonLost.info")}
                  description={t("panels.wonLost.description")}
                >
                  <WonLostChart data={data.wonLostByMonth} currency={data.currency} />
                </Panel>
              </div>

              {/* ------------------------------------------------- lists */}
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <Panel
                  title={t("panels.upNext.title")}
                  titleText={t("panels.upNext.titleText")}
                  info={t("panels.upNext.info")}
                  description={t("panels.upNext.description")}
                  href={href("/activities")}
                >
                  {data.errors.upNext ? (
                    <LoadError error={data.errors.upNext} />
                  ) : (
                    <UpNextList activities={data.upNext} />
                  )}
                </Panel>
                <div className="grid min-w-0 gap-4">
                  <Panel title={t("panels.recentPeople.title")} href={href("/people")}>
                    {data.errors.people ? (
                      <LoadError error={data.errors.people} />
                    ) : (
                      <RecentPeopleList people={data.recentPeople} />
                    )}
                  </Panel>
                  <Panel title={t("panels.recentDeals.title")} href={href("/deals")}>
                    {data.errors.deals ? (
                      <LoadError error={data.errors.deals} />
                    ) : (
                      <RecentDealsList deals={data.recentDeals} />
                    )}
                  </Panel>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
