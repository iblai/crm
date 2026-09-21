"use client";

import Link from "next/link";
import { Handshake, Sparkles, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";

/** Shown while the organization has neither people nor deals. */
export function OnboardingCard() {
  const { href } = useSession();
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--border-color,#e5e7eb)] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="bg-gradient-to-br from-[#eef6fc] to-white px-6 py-8 md:px-10 md:py-10">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-white text-[#0058cc] shadow-sm">
          <Sparkles className="size-5" />
        </span>
        <h2 className="mt-4 text-xl font-semibold tracking-tight text-gray-900">
          Your CRM is ready
        </h2>
        <p className="text-muted-foreground mt-1.5 max-w-lg text-sm">
          Start by adding a person, then open a deal for them. Everything else — organizations,
          activities and tags — hangs off those two.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button className="ibl-button-primary" render={<Link href={href("/people?new=1")} />}>
            <UserPlus data-icon="inline-start" /> Add a person
          </Button>
          <Button variant="outline" render={<Link href={href("/deals?new=1")} />}>
            <Handshake data-icon="inline-start" /> Create a deal
          </Button>
        </div>
      </div>
      <ol className="grid gap-px bg-gray-100 sm:grid-cols-3">
        {[
          {
            n: 1,
            title: "Add people",
            body: "Contacts are the anchor of every deal and activity.",
          },
          { n: 2, title: "Open deals", body: "Track opportunities through your pipeline stages." },
          {
            n: 3,
            title: "Log activity",
            body: "Calls, meetings and notes keep the history honest.",
          },
        ].map((step) => (
          <li key={step.n} className="bg-white px-5 py-4">
            <span className="flex size-6 items-center justify-center rounded-full bg-[#eef6fc] text-xs font-semibold text-[#0058cc]">
              {step.n}
            </span>
            <p className="mt-2 text-sm font-medium text-gray-900">{step.title}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
