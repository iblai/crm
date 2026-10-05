"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  BookOpen,
  Building2,
  ExternalLink,
  Eye,
  Mail,
  Plug,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminMode } from "@/components/crm/admin-mode";
import { useSession } from "@/hooks/use-session";
import { isUnnamedTenant, tenantDisplayName } from "@/lib/iblai/tenant";
import config from "@/lib/iblai/config";

// `name` is the platform's seeded role name, so it stays untranslated.
const ROLES = [
  { id: "viewer", name: "CRM Viewer", icon: Eye, tone: "bg-gray-100 text-gray-600" },
  { id: "user", name: "CRM User", icon: Users, tone: "bg-[#eef6fc] text-[#0058cc]" },
  { id: "manager", name: "CRM Manager", icon: ShieldCheck, tone: "bg-violet-50 text-violet-600" },
  { id: "inviter", name: "CRM Inviter", icon: Mail, tone: "bg-amber-50 text-amber-600" },
] as const;

export function AboutTab() {
  const t = useTranslations("settings.about");
  const tc = useTranslations("common");
  const ts = useTranslations("shell");
  const { tenantKey, currentTenant, href } = useSession();
  const { adminMode } = useAdminMode();
  const apiBase = `${config.dmUrl()}/api/crm/`;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Building2 className="size-4 text-[#0058cc]" strokeWidth={1.75} />
          {t("thisOrganization")}
        </h3>
        <dl className="mt-3 divide-y divide-gray-100 text-sm">
          <Row label={tc("name")}>
            {isUnnamedTenant(currentTenant)
              ? ts("organization")
              : tenantDisplayName(currentTenant) || tenantKey || "—"}
          </Row>
          <Row label={t("organizationKey")}>
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-700">
              {tenantKey || "—"}
            </code>
          </Row>
          <Row label={t("apiBase")}>
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] break-all text-gray-700">
              {apiBase}
            </code>
          </Row>
          <Row label={t("app")}>
            {config.appName()} · {t("communityOrg")}{" "}
            <code className="font-mono text-[11px]">{config.mainTenantKey()}</code>
          </Row>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            render={
              <a
                href={config.documentationUrl()}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={t("docsLabel")}
              />
            }
          >
            <BookOpen data-icon="inline-start" /> {t("docs")}
            <ExternalLink data-icon="inline-end" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={
              <a
                href={config.helpCenterUrl()}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={t("supportLabel")}
              />
            }
          >
            <Plug data-icon="inline-start" /> {t("support")}
            <ExternalLink data-icon="inline-end" />
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <UserCog className="size-4 text-[#0058cc]" strokeWidth={1.75} />
            {t("rolesTitle")}
          </h3>
          {adminMode ? (
            <Button variant="outline" size="sm" render={<Link href={href("/admin/users")} />}>
              <ShieldCheck data-icon="inline-start" /> {t("manageRoles")}
            </Button>
          ) : null}
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-[#fafbfc]">
              <TableHead className="text-muted-foreground text-xs">{t("role")}</TableHead>
              <TableHead className="text-muted-foreground text-xs">{t("mandate")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROLES.map((role) => (
              <TableRow key={role.name}>
                <TableCell className="py-2 align-top">
                  <span className="flex items-center gap-2 text-sm font-medium whitespace-nowrap text-gray-900">
                    <span
                      className={`flex size-6 items-center justify-center rounded-md ${role.tone}`}
                    >
                      <role.icon className="size-3.5" strokeWidth={1.75} />
                    </span>
                    {role.name}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground py-2 text-xs whitespace-normal">
                  {t(`mandates.${role.id}`)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-muted-foreground border-t border-gray-100 px-4 py-3 text-[11px]">
          {t("rolesFootnote")}
        </p>
      </section>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] items-center gap-2 py-2">
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd className="min-w-0 text-sm text-gray-900">{children}</dd>
    </div>
  );
}
