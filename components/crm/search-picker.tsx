"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EntityAvatar } from "@/components/crm/entity-avatar";
import { useDebounced } from "@/hooks/use-debounced";
import {
  errorMessage,
  useGetOrganizationQuery,
  useGetPersonQuery,
  useSearchQuery,
} from "@/lib/crm/api";
import { cn } from "@/lib/utils";

type Kind = "person" | "organization";

/**
 * A combobox over `/api/crm/search/` for one person or organization — the server
 * matches, so the list is never "the first 100 rows".
 */
export function SearchPicker({
  kind,
  value,
  onChange,
  placeholder,
  disabled,
  invalid,
  size = "default",
  className,
}: {
  kind: Kind;
  value: string | null | undefined;
  /** `hit.organization` is the picked person's organization. */
  onChange: (id: string | null, hit?: { organization?: string | null }) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  size?: "sm" | "default";
  className?: string;
}) {
  const t = useTranslations("picker");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = useDebounced(query.trim(), 250);
  const { data, isFetching, error } = useSearchQuery({ q, limit: 10 }, { skip: q.length === 0 });
  const person = useGetPersonQuery(value ?? "", { skip: kind !== "person" || !value });
  const organization = useGetOrganizationQuery(value ?? "", {
    skip: kind !== "organization" || !value,
  });
  const selectedLabel = kind === "person" ? person.data?.name : organization.data?.name;
  const results =
    kind === "person"
      ? (data?.persons ?? []).map((p) => ({
          id: p.id,
          label: p.name,
          hint: p.primary_email,
          organization: p.organization,
        }))
      : (data?.organizations ?? []).map((o) => ({
          id: o.id,
          label: o.name,
          hint: undefined,
          organization: undefined,
        }));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size={size}
            disabled={disabled}
            aria-expanded={open}
            aria-invalid={invalid || undefined}
            className={cn("w-full justify-between font-normal", className)}
          />
        }
      >
        <span
          className={cn("min-w-0 flex-1 truncate text-left", !value && "text-muted-foreground")}
        >
          {value
            ? (selectedLabel ?? "…")
            : (placeholder ?? t(kind === "person" ? "person" : "organization"))}
        </span>
        <ChevronsUpDown className="text-muted-foreground size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--anchor-width] min-w-72 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder={t("searchPlaceholder")}
          />
          <CommandList>
            <CommandEmpty>
              {q.length === 0
                ? t("typeToSearch")
                : isFetching
                  ? t("searching")
                  : error
                    ? errorMessage(error, tc("errorGeneric"))
                    : t("noMatches")}
            </CommandEmpty>
            {value ? (
              <CommandGroup>
                <CommandItem
                  value="__clear"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="text-muted-foreground gap-2"
                >
                  <X className="size-4" /> {placeholder ?? t("clear")}
                </CommandItem>
              </CommandGroup>
            ) : null}
            {results.length > 0 ? (
              <CommandGroup>
                {results.map((row) => (
                  <CommandItem
                    key={row.id}
                    value={row.id}
                    onSelect={() => {
                      onChange(row.id, row);
                      setOpen(false);
                      setQuery("");
                    }}
                    className="gap-2"
                  >
                    <EntityAvatar name={row.label} seed={row.id} kind={kind} size="xs" />
                    <span className="min-w-0 flex-1 truncate">{row.label}</span>
                    {row.hint ? (
                      <span className="text-muted-foreground truncate text-xs">{row.hint}</span>
                    ) : null}
                    {row.id === value ? <Check className="size-4 text-[#0058cc]" /> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
