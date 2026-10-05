"use client";

import { Suspense, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { GitBranch, Info, Radio, Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/crm/page-header";
import { useBreadcrumbs } from "@/components/crm/breadcrumbs";
import { PipelinesTab } from "@/components/crm/settings/pipelines-tab";
import { LeadSourcesTab } from "@/components/crm/settings/lead-sources-tab";
import { AboutTab } from "@/components/crm/settings/about-tab";
import { useSession } from "@/hooks/use-session";

const TABS = ["pipelines", "sources", "about"] as const;
type TabValue = (typeof TABS)[number];

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsFallback />}>
      <SettingsView />
    </Suspense>
  );
}

function SettingsFallback() {
  const t = useTranslations("settings");
  const tn = useTranslations("nav");
  return (
    <>
      <PageHeader icon={<Settings />} title={tn("settings")} description={t("description")} />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    </>
  );
}

function SettingsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("settings");
  const tn = useTranslations("nav");
  const { href } = useSession();
  useBreadcrumbs([{ label: tn("settings"), href: href("/settings") }]);

  const tab = useMemo<TabValue>(() => {
    const raw = searchParams.get("tab");
    return TABS.includes(raw as TabValue) ? (raw as TabValue) : "pipelines";
  }, [searchParams]);

  const setTab = useCallback(
    (value: TabValue) => {
      router.replace(
        value === "pipelines" ? href("/settings") : `${href("/settings")}?tab=${value}`,
      );
    },
    [router, href],
  );

  return (
    <>
      <PageHeader icon={<Settings />} title={tn("settings")} description={t("description")} />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <Tabs value={tab} onValueChange={(value) => setTab(value as TabValue)} className="gap-4">
          <TabsList variant="line" className="h-9 border-b border-gray-200 pb-1">
            <TabsTrigger value="pipelines">
              <GitBranch strokeWidth={1.75} /> {t("tabs.pipelines")}
            </TabsTrigger>
            <TabsTrigger value="sources">
              <Radio strokeWidth={1.75} /> {t("tabs.sources")}
            </TabsTrigger>
            <TabsTrigger value="about">
              <Info strokeWidth={1.75} /> {t("tabs.about")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pipelines">
            <PipelinesTab />
          </TabsContent>
          <TabsContent value="sources">
            <LeadSourcesTab />
          </TabsContent>
          <TabsContent value="about">
            <AboutTab />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
