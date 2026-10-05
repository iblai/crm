"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Building2,
  CalendarCheck2,
  Handshake,
  Home,
  Plus,
  Settings,
  Tag,
  Users,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { EntityAvatar } from "@/components/crm/entity-avatar";
import { useDebounced } from "@/hooks/use-debounced";
import { useSession } from "@/hooks/use-session";
import { errorMessage, useSearchQuery } from "@/lib/crm/api";
import { formatCurrency } from "@/lib/crm/format";

const PaletteContext = createContext<{ open: () => void; close: () => void }>({
  open: () => {},
  close: () => {},
});

export function useCommandPalette() {
  return useContext(PaletteContext);
}

/** ⌘K: server search across people, companies and deals, plus navigation and "New …" actions. */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <PaletteContext.Provider value={{ open, close }}>
      {children}
      <CommandPalette open={isOpen} onOpenChange={setIsOpen} />
    </PaletteContext.Provider>
  );
}

function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const t = useTranslations("palette");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const { href } = useSession();
  const [query, setQuery] = useState("");

  const q = useDebounced(query.trim(), 250);
  const { data, error } = useSearchQuery({ q, limit: 6 }, { skip: !open || !q });
  const matchedPeople = q ? (data?.persons ?? []) : [];
  const matchedOrgs = q ? (data?.organizations ?? []) : [];
  const matchedDeals = q ? (data?.deals ?? []) : [];

  const go = (path: string) => {
    onOpenChange(false);
    setQuery("");
    router.push(href(path));
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tc("search")}
      description={t("description")}
      className="max-w-xl"
    >
      <Command shouldFilter={false} className="rounded-xl">
        <CommandInput
          autoFocus
          placeholder={t("placeholder")}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[60vh]">
          <CommandEmpty>{t("noResults")}</CommandEmpty>
          {q && error ? (
            <p role="alert" className="text-destructive px-3 py-2 text-xs">
              {errorMessage(error, tc("errorGeneric"))}
            </p>
          ) : null}
          {matchedPeople.length ? (
            <CommandGroup heading={tn("people")}>
              {matchedPeople.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`person-${p.id}-${p.name}`}
                  onSelect={() => go(`/people/${p.id}`)}
                >
                  <EntityAvatar name={p.name} seed={p.id} size="sm" />
                  <span className="truncate">{p.name}</span>
                  {p.primary_email ? (
                    <span className="text-muted-foreground ml-auto truncate text-xs">
                      {p.primary_email}
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {matchedOrgs.length ? (
            <CommandGroup heading={tn("companies")}>
              {matchedOrgs.map((o) => (
                <CommandItem
                  key={o.id}
                  value={`org-${o.id}-${o.name}`}
                  onSelect={() => go(`/companies/${o.id}`)}
                >
                  <EntityAvatar name={o.name} seed={o.id} kind="organization" size="sm" />
                  <span className="truncate">{o.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {matchedDeals.length ? (
            <CommandGroup heading={tn("deals")}>
              {matchedDeals.map((d) => (
                <CommandItem
                  key={d.id}
                  value={`deal-${d.id}-${d.title}`}
                  onSelect={() => go(`/deals/${d.id}`)}
                >
                  <Handshake className="size-4 text-[#0058cc]" />
                  <span className="truncate">{d.title}</span>
                  <span className="text-muted-foreground ml-auto text-xs">
                    {formatCurrency(d.lead_value, d.currency, locale)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          <CommandSeparator />
          <CommandGroup heading={tc("create")}>
            <CommandItem value="new person" onSelect={() => go("/people?new=1")}>
              <Plus className="size-4" /> {t("newPerson")}
            </CommandItem>
            <CommandItem value="new organization" onSelect={() => go("/companies?new=1")}>
              <Plus className="size-4" /> {t("newCompany")}
            </CommandItem>
            <CommandItem value="new deal" onSelect={() => go("/deals?new=1")}>
              <Plus className="size-4" /> {t("newDeal")}
            </CommandItem>
            <CommandItem value="new activity" onSelect={() => go("/activities?new=1")}>
              <Plus className="size-4" /> {t("newActivity")}
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading={t("goTo")}>
            <CommandItem value="go home" onSelect={() => go("")}>
              <Home className="size-4" /> {tn("home")}
            </CommandItem>
            <CommandItem value="go people" onSelect={() => go("/people")}>
              <Users className="size-4" /> {tn("people")}
            </CommandItem>
            <CommandItem value="go organizations" onSelect={() => go("/companies")}>
              <Building2 className="size-4" /> {tn("companies")}
            </CommandItem>
            <CommandItem value="go deals" onSelect={() => go("/deals")}>
              <Handshake className="size-4" /> {tn("deals")}
            </CommandItem>
            <CommandItem value="go activities" onSelect={() => go("/activities")}>
              <CalendarCheck2 className="size-4" /> {tn("activities")}
            </CommandItem>
            <CommandItem value="go tags" onSelect={() => go("/tags")}>
              <Tag className="size-4" /> {tn("tags")}
            </CommandItem>
            <CommandItem value="go settings" onSelect={() => go("/settings")}>
              <Settings className="size-4" /> {tn("settings")}
            </CommandItem>
          </CommandGroup>
        </CommandList>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-100 px-3 py-2 text-[11px]">
          <span>
            <kbd className="rounded border border-gray-200 bg-white px-1 font-sans">↑</kbd>
            <kbd className="ml-0.5 rounded border border-gray-200 bg-white px-1 font-sans">
              ↓
            </kbd>{" "}
            {t("toNavigate")}
          </span>
          <span>
            <kbd className="rounded border border-gray-200 bg-white px-1 font-sans">↵</kbd>{" "}
            {t("toOpen")}
          </span>
          <span>
            <kbd className="rounded border border-gray-200 bg-white px-1 font-sans">esc</kbd>{" "}
            {t("toClose")}
          </span>
        </div>
      </Command>
    </CommandDialog>
  );
}
