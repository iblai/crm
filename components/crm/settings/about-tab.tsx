"use client";

import Link from "next/link";
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
import { useSession } from "@/hooks/use-session";
import { tenantDisplayName } from "@/lib/iblai/tenant";
import config from "@/lib/iblai/config";

const ROLES = [
  {
    name: "CRM Viewer",
    icon: Eye,
    tone: "bg-gray-100 text-gray-600",
    mandate: "Reads everything in the CRM and writes nothing.",
  },
  {
    name: "CRM User",
    icon: Users,
    tone: "bg-[#eef6fc] text-[#0058cc]",
    mandate:
      "Full CRUD on people, organizations, deals, activities and tags; pipelines are read-only; cannot invite.",
  },
  {
    name: "CRM Manager",
    icon: ShieldCheck,
    tone: "bg-violet-50 text-violet-600",
    mandate:
      "Everything a User can do, plus pipeline, stage and lead-source administration, and invitations.",
  },
  {
    name: "CRM Inviter",
    icon: Mail,
    tone: "bg-amber-50 text-amber-600",
    mandate: "Reads people and sends invitations — nothing else.",
  },
];

export function AboutTab() {
  const { tenantKey, currentTenant, href } = useSession();
  const apiBase = `${config.dmUrl()}/api/crm/`;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Building2 className="size-4 text-[#0058cc]" strokeWidth={1.75} />
          This organization
        </h3>
        <dl className="mt-3 divide-y divide-gray-100 text-sm">
          <Row label="Name">{tenantDisplayName(currentTenant) || tenantKey || "—"}</Row>
          <Row label="Organization key">
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-700">
              {tenantKey || "—"}
            </code>
          </Row>
          <Row label="API base">
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] break-all text-gray-700">
              {apiBase}
            </code>
          </Row>
          <Row label="App">
            {config.appName()} · community org{" "}
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
                aria-label="Open the ibl.ai documentation"
              />
            }
          >
            <BookOpen data-icon="inline-start" /> ibl.ai docs
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
                aria-label="Open ibl.ai support"
              />
            }
          >
            <Plug data-icon="inline-start" /> Support
            <ExternalLink data-icon="inline-end" />
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <UserCog className="size-4 text-[#0058cc]" strokeWidth={1.75} />
            CRM roles
          </h3>
          <Button variant="outline" size="sm" render={<Link href={href("/admin/users")} />}>
            <ShieldCheck data-icon="inline-start" /> Manage roles
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-[#fafbfc]">
              <TableHead className="text-muted-foreground text-xs">Role</TableHead>
              <TableHead className="text-muted-foreground text-xs">Mandate</TableHead>
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
                  {role.mandate}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-muted-foreground border-t border-gray-100 px-4 py-3 text-[11px]">
          Roles are granted on the organization's Users &amp; roles screen. Only CRM Managers (org
          admins) can change pipelines, stages and lead sources.
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
