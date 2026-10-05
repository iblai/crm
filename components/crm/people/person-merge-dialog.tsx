"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EntityAvatar } from "@/components/crm/entity-avatar";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { useToastApiError } from "@/components/crm/people/crm-error";
import { useDebounced } from "@/hooks/use-debounced";
import { useListPersonsQuery, useMergePersonsMutation } from "@/lib/crm/api";
import type { Person } from "@/lib/crm/types";

/**
 * Fold duplicate records into this person: their deals, activities and tags
 * move over and the duplicates are marked inactive. Irreversible, so the final step
 * is a confirmation.
 */
export function PersonMergeDialog({
  open,
  onOpenChange,
  person,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: Person;
}) {
  const t = useTranslations("people");
  const tc = useTranslations("common");
  const toastApiError = useToastApiError();
  const [merge, { isLoading: merging }] = useMergePersonsMutation();
  const [query, setQuery] = useState("");
  const q = useDebounced(query.trim());
  const { data, isLoading } = useListPersonsQuery(
    { active: true, search: q || undefined, page_size: 50 },
    { skip: !open },
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected([]);
    setConfirm(false);
  }, [open]);

  const candidates = useMemo(
    () => (data?.results ?? []).filter((p) => p.id !== person.id),
    [data, person.id],
  );

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const runMerge = async () => {
    try {
      await merge({ primary_id: person.id, duplicate_ids: selected }).unwrap();
      setConfirm(false);
      onOpenChange(false);
      toast.success(t("merge.merged", { count: selected.length, name: person.name }));
    } catch (err) {
      setConfirm(false);
      toastApiError(err, t("merge.error"));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("merge.title", { name: person.name })}</DialogTitle>
            <DialogDescription>{t("merge.description", { name: person.name })}</DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search
              strokeWidth={1.75}
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-gray-400"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("merge.searchPlaceholder")}
              className="pl-8"
              aria-label={t("merge.searchLabel")}
            />
          </div>

          <div className="max-h-72 min-h-40 overflow-auto rounded-lg border border-[var(--border-color,#e5e7eb)]">
            {isLoading ? (
              <div className="space-y-2 p-3">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-9 w-full rounded-md" />
                ))}
              </div>
            ) : candidates.length === 0 ? (
              <p className="text-muted-foreground p-6 text-center text-sm">
                {query.trim() ? t("merge.noMatch") : t("merge.noOne")}
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {candidates.map((p) => (
                  <li key={p.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-50">
                      <Checkbox
                        checked={selected.includes(p.id)}
                        onCheckedChange={() => toggle(p.id)}
                        aria-label={t("merge.select", { name: p.name })}
                      />
                      <EntityAvatar name={p.name} seed={p.id} kind="person" size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-gray-900">
                          {p.name}
                        </span>
                        {p.primary_email ? (
                          <span className="text-muted-foreground block truncate text-xs">
                            {p.primary_email}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              {tc("cancel")}
            </DialogClose>
            <Button
              variant="destructive"
              disabled={selected.length === 0 || merging}
              onClick={() => setConfirm(true)}
            >
              {t("merge.submit", { count: selected.length })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t("merge.confirmTitle")}
        description={t("merge.confirmBody", { count: selected.length, name: person.name })}
        confirmLabel={t("merge.confirm")}
        destructive
        loading={merging}
        onConfirm={runMerge}
      />
    </>
  );
}
