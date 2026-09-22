"use client";

import Link from "next/link";
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
import { StatCard } from "@/components/crm/stat-card";
import { Panel } from "@/components/crm/dashboard/panel";
import { DealsByStageChart } from "@/components/crm/dashboard/deals-by-stage-chart";
import { WonLostChart } from "@/components/crm/dashboard/won-lost-chart";
import { UpNextList } from "@/components/crm/dashboard/up-next-list";
import { RecentDealsList, RecentPeopleList } from "@/components/crm/dashboard/recent-lists";
import { OnboardingCard } from "@/components/crm/dashboard/onboarding-card";
import { useDashboardData } from "@/components/crm/dashboard/use-dashboard-data";
import { useSession } from "@/hooks/use-session";
import { formatCompactCurrency, formatCurrency, pluralize } from "@/lib/crm/format";

export default function HomePage() {
  const { displayName, href } = useSession();
  const data = useDashboardData();
  const { stats } = data;

  return (
    <>
      <PageHeader
        icon={<Home />}
        title="Home"
        description={`Welcome back${displayName ? `, ${displayName}` : ""}`}
        actions={
          <>
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
                <UserPlus data-icon="inline-start" /> New person
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Add a contact — deals and activities hang off people
              </TooltipContent>
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
                <CalendarPlus data-icon="inline-start" /> Log activity
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Record a call or note, or schedule a task or meeting
              </TooltipContent>
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
                <Handshake data-icon="inline-start" /> New deal
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Open a deal for a person; it starts in the first stage
              </TooltipContent>
            </Tooltip>
          </>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-7xl space-y-4 p-4 md:p-6">
          {data.isEmptyOrg ? (
            <OnboardingCard />
          ) : (
            <>
              {/* ------------------------------------------------- stats */}
              {data.isLoading && data.deals.length === 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  {Array.from({ length: 6 }, (_, i) => (
                    <Skeleton key={i} className="h-24 rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  <StatCard
                    label="Open deals"
                    labelText="open deals"
                    value={stats.openCount}
                    hint="in every pipeline"
                    info="Deals that are neither won nor lost yet."
                    icon={<Handshake />}
                    tone="brand"
                  />
                  <StatCard
                    label="Pipeline value"
                    labelText="pipeline value"
                    value={formatCompactCurrency(stats.pipelineValue, stats.currency)}
                    hint={formatCurrency(stats.pipelineValue, stats.currency)}
                    info="Sum of open deals' values."
                    icon={<Wallet />}
                    tone="brand"
                  />
                  <StatCard
                    label="Weighted"
                    labelText="weighted pipeline"
                    value={formatCompactCurrency(stats.weighted, stats.currency)}
                    hint="by stage probability"
                    info="Each open deal multiplied by its stage probability."
                    icon={<Gauge />}
                  />
                  <StatCard
                    label="Won this month"
                    labelText="deals won this month"
                    value={stats.wonCount}
                    hint={formatCurrency(stats.wonValue, stats.currency)}
                    info="Deals closed as won since the first of this month."
                    icon={<Trophy />}
                    tone="success"
                  />
                  <StatCard
                    label="People"
                    labelText="people"
                    value={data.peopleCount}
                    hint="contacts on record"
                    info="Every contact in this organization."
                    icon={<Users />}
                  />
                  <StatCard
                    label="Due today"
                    labelText="activities due today"
                    value={data.upcoming.dueToday}
                    hint={
                      data.upcoming.overdue > 0
                        ? `${pluralize(data.upcoming.overdue, "overdue item")}`
                        : "nothing overdue"
                    }
                    info="Open activities scheduled for today; overdue counts what is past due."
                    icon={<CalendarClock />}
                    tone={data.upcoming.overdue > 0 ? "warning" : "default"}
                  />
                </div>
              )}

              {/* ------------------------------------------------ charts */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Panel
                  title="Deals by stage"
                  titleText="deals by stage"
                  info="Open deals in the default pipeline, by stage."
                  description={data.lookups.defaultPipeline?.name ?? "Default pipeline"}
                  href={href("/deals")}
                  linkLabel="Open board"
                >
                  <DealsByStageChart data={data.stageBreakdown} currency={stats.currency} />
                </Panel>
                <Panel
                  title="Won vs lost"
                  titleText="won versus lost deals"
                  info="Deals closed in the last 6 months, by close date."
                  description="Last 6 months"
                >
                  <WonLostChart data={data.wonLostByMonth} currency={stats.currency} />
                </Panel>
              </div>

              {/* ------------------------------------------------- lists */}
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <Panel
                  title="Up next"
                  titleText="up next"
                  info="The soonest open activities scheduled across the organization."
                  description="Open, scheduled work"
                  href={href("/activities")}
                >
                  <UpNextList activities={data.upcoming.list.slice(0, 6)} />
                </Panel>
                <div className="grid min-w-0 gap-4">
                  <Panel title="Recently added people" href={href("/people")}>
                    <RecentPeopleList people={data.recentPeople} />
                  </Panel>
                  <Panel title="Recent deals" href={href("/deals")}>
                    <RecentDealsList
                      deals={data.recentDeals}
                      personName={data.lookups.personName}
                    />
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
