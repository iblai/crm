"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
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
import { useSession } from "@/hooks/use-session";
import { useListDealsQuery, useListOrganizationsQuery, useListPersonsQuery } from "@/lib/crm/api";
import { formatCurrency } from "@/lib/crm/format";

const PaletteContext = createContext<{ open: () => void; close: () => void }>({
  open: () => {},
  close: () => {},
});

export function useCommandPalette() {
  return useContext(PaletteContext);
}

/**
 * ⌘K search across people, organizations and deals (client-side match over
 * the first pages — the CRM API has no cross-resource search endpoint) plus
 * quick navigation and "New …" actions.
 */
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
  const router = useRouter();
  const { href } = useSession();
  const [query, setQuery] = useState("");

  const { data: people } = useListPersonsQuery({ page_size: 100 }, { skip: !open });
  const { data: orgs } = useListOrganizationsQuery({ page_size: 100 }, { skip: !open });
  const { data: deals } = useListDealsQuery({ page_size: 100 }, { skip: !open });

  const go = (path: string) => {
    onOpenChange(false);
    setQuery("");
    router.push(href(path));
  };

  const q = query.trim().toLowerCase();
  const match = (...fields: Array<string | undefined | null>) =>
    !q || fields.some((f) => f && f.toLowerCase().includes(q));

  const matchedPeople = useMemo(
    () =>
      (people?.results ?? [])
        .filter((p) => match(p.name, p.primary_email, p.job_title))
        .slice(0, 6),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [people, q],
  );
  const matchedOrgs = useMemo(
    () => (orgs?.results ?? []).filter((o) => match(o.name)).slice(0, 6),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orgs, q],
  );
  const matchedDeals = useMemo(
    () => (deals?.results ?? []).filter((d) => match(d.title)).slice(0, 6),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deals, q],
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Search people, organizations and deals, or jump to a page."
      className="max-w-xl"
    >
      <Command shouldFilter={false} className="rounded-xl">
        <CommandInput
          autoFocus
          placeholder="Search people, organizations, deals…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[60vh]">
          <CommandEmpty>No results.</CommandEmpty>
          {matchedPeople.length ? (
            <CommandGroup heading="People">
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
            <CommandGroup heading="Organizations">
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
            <CommandGroup heading="Deals">
              {matchedDeals.map((d) => (
                <CommandItem
                  key={d.id}
                  value={`deal-${d.id}-${d.title}`}
                  onSelect={() => go(`/deals/${d.id}`)}
                >
                  <Handshake className="size-4 text-[#0058cc]" />
                  <span className="truncate">{d.title}</span>
                  <span className="text-muted-foreground ml-auto text-xs">
                    {formatCurrency(d.lead_value, d.currency)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          <CommandSeparator />
          <CommandGroup heading="Create">
            <CommandItem value="new person" onSelect={() => go("/people?new=1")}>
              <Plus className="size-4" /> New person
            </CommandItem>
            <CommandItem value="new organization" onSelect={() => go("/organizations?new=1")}>
              <Plus className="size-4" /> New organization
            </CommandItem>
            <CommandItem value="new deal" onSelect={() => go("/deals?new=1")}>
              <Plus className="size-4" /> New deal
            </CommandItem>
            <CommandItem value="new activity" onSelect={() => go("/activities?new=1")}>
              <Plus className="size-4" /> New activity
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Go to">
            <CommandItem value="go home" onSelect={() => go("")}>
              <Home className="size-4" /> Home
            </CommandItem>
            <CommandItem value="go people" onSelect={() => go("/people")}>
              <Users className="size-4" /> People
            </CommandItem>
            <CommandItem value="go organizations" onSelect={() => go("/organizations")}>
              <Building2 className="size-4" /> Organizations
            </CommandItem>
            <CommandItem value="go deals" onSelect={() => go("/deals")}>
              <Handshake className="size-4" /> Deals
            </CommandItem>
            <CommandItem value="go activities" onSelect={() => go("/activities")}>
              <CalendarCheck2 className="size-4" /> Activities
            </CommandItem>
            <CommandItem value="go tags" onSelect={() => go("/tags")}>
              <Tag className="size-4" /> Tags
            </CommandItem>
            <CommandItem value="go settings" onSelect={() => go("/settings")}>
              <Settings className="size-4" /> Settings
            </CommandItem>
          </CommandGroup>
        </CommandList>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-gray-100 px-3 py-2 text-[11px]">
          <span>
            <kbd className="rounded border border-gray-200 bg-white px-1 font-sans">↑</kbd>
            <kbd className="ml-0.5 rounded border border-gray-200 bg-white px-1 font-sans">
              ↓
            </kbd>{" "}
            to navigate
          </span>
          <span>
            <kbd className="rounded border border-gray-200 bg-white px-1 font-sans">↵</kbd> to open
          </span>
          <span>
            <kbd className="rounded border border-gray-200 bg-white px-1 font-sans">esc</kbd> to
            close
          </span>
        </div>
      </Command>
    </CommandDialog>
  );
}
