"use client";

import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@iblai/iblai-js/web-containers";
import { SimpleSelect } from "@/components/crm/simple-select";
import { useToastApiError } from "@/components/crm/people/crm-error";
import { useMemberLabel, useMembers } from "@/hooks/use-members";
import { useSession } from "@/hooks/use-session";
import { useLinkPersonUserMutation } from "@/lib/crm/api";
import type { Person } from "@/lib/crm/types";

/**
 * Link a person to an existing platform account. Picks from the org's member
 * directory when it is readable, and always accepts a raw user id so members
 * without directory access can still link a known account.
 */
export function PersonLinkUserDialog({
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
  const { tenantKey } = useSession();
  const { members, isLoading: loadingMembers } = useMembers(tenantKey, { skip: !open });
  const memberLabel = useMemberLabel();
  const [linkUser, { isLoading }] = useLinkPersonUserMutation();
  const [selected, setSelected] = useState("");
  const [manualId, setManualId] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelected(person.platform_user ? String(person.platform_user) : "");
    setManualId("");
  }, [open, person.platform_user]);

  const userId = Number(manualId.trim() || selected);
  const valid = Number.isFinite(userId) && userId > 0;

  const submit = async () => {
    if (!valid) return;
    try {
      await linkUser({ id: person.id, user_id: userId }).unwrap();
      onOpenChange(false);
      toast.success(t("linkUser.linked", { name: person.name, id: String(userId) }));
    } catch (err) {
      toastApiError(err, t("linkUser.error"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("linkUser.title")}</DialogTitle>
          <DialogDescription>{t("linkUser.description", { name: person.name })}</DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-1.5">
            <Label className="text-muted-foreground text-xs">{tc("member")}</Label>
            <SimpleSelect
              value={selected}
              onChange={(v) => {
                setSelected(v);
                setManualId("");
              }}
              options={members.map((m) => ({ value: String(m.id), label: memberLabel(m) }))}
              allowEmpty
              emptyLabel={t("linkUser.chooseMember")}
              placeholder={
                loadingMembers ? t("linkUser.loadingMembers") : t("linkUser.chooseMember")
              }
              aria-label={tc("member")}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="link-user-id" className="text-muted-foreground text-xs">
              {t("linkUser.manualLabel")}
            </Label>
            <Input
              id="link-user-id"
              inputMode="numeric"
              value={manualId}
              onChange={(e) => setManualId(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder={t("linkUser.manualPlaceholder")}
            />
            <p className="text-muted-foreground text-xs">{t("linkUser.manualHint")}</p>
          </div>

          <DialogFooter className="mt-1">
            <DialogClose render={<Button variant="outline" type="button" />}>
              {tc("cancel")}
            </DialogClose>
            <Button type="submit" className="ibl-button-primary" disabled={!valid || isLoading}>
              {isLoading ? <Spinner size="sm" className="size-4 text-current" /> : null}
              {t("linkUser.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
