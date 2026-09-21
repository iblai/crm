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
            <Button variant="outline" size="sm" render={<Link href={href("/people?new=1")} />}>
              <UserPlus data-icon="inline-start" /> New person
            </Button>
            <Button variant="outline" size="sm" render={<Link href={href("/activities?new=1")} />}>
              <CalendarPlus data-icon="inline-start" /> Log activity
            </Button>
            <Button size="sm" className="ibl-button-primary" render={<Link href={href("/deals?new=1")} />}>
              <Handshake data-icon="inline-start" /> New deal
            </Button>
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
                    value={stats.openCount}
                    hint="in every pipeline"
                    icon={<Handshake />}
                    tone="brand"
                  />
                  <StatCard
                    label="Pipeline value"
                    value={formatCompactCurrency(stats.pipelineValue, stats.currency)}
                    hint={formatCurrency(stats.pipelineValue, stats.currency)}
                    icon={<Wallet />}
                    tone="brand"
                  />
                  <StatCard
                    label="Weighted"
                    value={formatCompactCurrency(stats.weighted, stats.currency)}
                    hint="by stage probability"
                    icon={<Gauge />}
                  />
                  <StatCard
                    label="Won this month"
                    value={stats.wonCount}
                    hint={formatCurrency(stats.wonValue, stats.currency)}
                    icon={<Trophy />}
                    tone="success"
                  />
                  <StatCard
                    label="People"
                    value={data.peopleCount}
                    hint="contacts on record"
                    icon={<Users />}
                  />
                  <StatCard
                    label="Due today"
                    value={data.upcoming.dueToday}
                    hint={
                      data.upcoming.overdue > 0
                        ? `${pluralize(data.upcoming.overdue, "overdue item")}`
                        : "nothing overdue"
                    }
                    icon={<CalendarClock />}
                    tone={data.upcoming.overdue > 0 ? "warning" : "default"}
                  />
                </div>
              )}

              {/* ------------------------------------------------ charts */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Panel
                  title="Deals by stage"
                  description={data.lookups.defaultPipeline?.name ?? "Default pipeline"}
                  href={href("/deals")}
                  linkLabel="Open board"
                >
                  <DealsByStageChart data={data.stageBreakdown} currency={stats.currency} />
                </Panel>
                <Panel title="Won vs lost" description="Last 6 months">
                  <WonLostChart data={data.wonLostByMonth} currency={stats.currency} />
                </Panel>
              </div>

              {/* ------------------------------------------------- lists */}
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <Panel title="Up next" description="Open, scheduled work" href={href("/activities")}>
                  <UpNextList activities={data.upcoming.list.slice(0, 6)} />
                </Panel>
                <div className="grid min-w-0 gap-4">
                  <Panel title="Recently added people" href={href("/people")}>
                    <RecentPeopleList people={data.recentPeople} />
                  </Panel>
                  <Panel title="Recent deals" href={href("/deals")}>
                    <RecentDealsList deals={data.recentDeals} personName={data.lookups.personName} />
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
