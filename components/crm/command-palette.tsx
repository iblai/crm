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

/** ⌘K: server search across people, organizations and deals, plus navigation and "New …" actions. */
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
  const { data, error, isFetching } = useSearchQuery({ q, limit: 6 }, { skip: !open || !q });
  const matchedPeople = q ? (data?.persons ?? []) : [];
  const matchedOrgs = q ? (data?.organizations ?? []) : [];
  const matchedDeals = q ? (data?.deals ?? []) : [];

  const go = (path: string) => {
    onOpenChange(false);
    setQuery("");
    router.push(href(path));
  };

  // Commands narrow to what is typed, so Enter opens the typed page.
  const typed = query.trim().toLowerCase();
  const shows = (label: string) => label.toLowerCase().includes(typed);
  const creates = (
    [
      ["newPerson", "/people?new=1"],
      ["newOrganization", "/organizations?new=1"],
      ["newDeal", "/deals?new=1"],
      ["newActivity", "/activities?new=1"],
    ] as const
  ).filter(([key]) => shows(t(key)));
  const pages = (
    [
      ["home", "", Home],
      ["people", "/people", Users],
      ["organizations", "/organizations", Building2],
      ["deals", "/deals", Handshake],
      ["activities", "/activities", CalendarCheck2],
      ["tags", "/tags", Tag],
      ["settings", "/settings", Settings],
    ] as const
  ).filter(([key]) => shows(tn(key)));

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tc("search")}
      description={t("description")}
    >
      <Command shouldFilter={false} className="rounded-xl">
        <CommandInput
          autoFocus
          placeholder={t("placeholder")}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[60vh]">
          {query.trim() === q && !isFetching ? <CommandEmpty>{t("noResults")}</CommandEmpty> : null}
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
            <CommandGroup heading={tn("organizations")}>
              {matchedOrgs.map((o) => (
                <CommandItem
                  key={o.id}
                  value={`org-${o.id}-${o.name}`}
                  onSelect={() => go(`/organizations/${o.id}`)}
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
          {creates.length ? (
            <CommandGroup heading={tc("create")}>
              {creates.map(([key, path]) => (
                <CommandItem key={key} value={key} onSelect={() => go(path)}>
                  <Plus className="size-4" /> {t(key)}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {pages.length ? (
            <CommandGroup heading={t("goTo")}>
              {pages.map(([key, path, Icon]) => (
                <CommandItem key={key} value={`go ${key}`} onSelect={() => go(path)}>
                  <Icon className="size-4" /> {tn(key)}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
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
