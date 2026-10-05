"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { OwnerSelect } from "@/components/crm/owner-select";
import { useToastApiError } from "@/components/crm/people/crm-error";
import { useSession } from "@/hooks/use-session";
import { useCreateOrganizationMutation } from "@/lib/crm/api";
import type { Address, Organization } from "@/lib/crm/types";

const EMPTY = { street: "", city: "", state: "", postal_code: "", country: "" };

/** Create an organization — the company a person or a deal belongs to. */
export function OrganizationDialog({
  open,
  onOpenChange,
  navigateOnCreate = true,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navigateOnCreate?: boolean;
  onCreated?: (organization: Organization) => void;
}) {
  const t = useTranslations("companies");
  const tc = useTranslations("common");
  const toastApiError = useToastApiError();
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const { href, userId } = useSession();
  const [createOrganization, { isLoading }] = useCreateOrganizationMutation();

  const [name, setName] = useState("");
  const [address, setAddress] = useState({ ...EMPTY });
  const [owner, setOwner] = useState<number | null>(userId ?? null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setAddress({ ...EMPTY });
    setOwner(userId ?? null);
  }, [open, userId]);

  const set = (key: keyof typeof EMPTY, value: string) =>
    setAddress((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const cleaned: Address = {};
    for (const [key, value] of Object.entries(address)) {
      if (value.trim()) cleaned[key] = value.trim();
    }
    try {
      const organization = await createOrganization({
        name: trimmed,
        address: Object.keys(cleaned).length ? cleaned : undefined,
        owner: owner ?? null,
      }).unwrap();
      toast.success(t("dialog.added", { name: organization.name }));
      onOpenChange(false);
      onCreated?.(organization);
      if (navigateOnCreate) router.push(href(`/companies/${organization.id}`));
    } catch (err) {
      toastApiError(err, t("dialog.createError"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" initialFocus={nameRef}>
        <DialogHeader>
          <DialogTitle>{t("actions.new")}</DialogTitle>
          <DialogDescription>{t("dialog.description")}</DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="org-name" className="text-muted-foreground text-xs">
              {tc("name")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="org-name"
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("dialog.namePlaceholder")}
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="org-street" className="text-muted-foreground text-xs">
              {t("address.street")}
            </Label>
            <Input
              id="org-street"
              value={address.street}
              onChange={(e) => set("street", e.target.value)}
              placeholder={t("address.example.street")}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="org-city" className="text-muted-foreground text-xs">
                {t("address.city")}
              </Label>
              <Input
                id="org-city"
                value={address.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder={t("address.example.city")}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="org-state" className="text-muted-foreground text-xs">
                {t("address.state")}
              </Label>
              <Input
                id="org-state"
                value={address.state}
                onChange={(e) => set("state", e.target.value)}
                placeholder={t("address.example.state")}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="org-postal" className="text-muted-foreground text-xs">
                {t("address.postalCode")}
              </Label>
              <Input
                id="org-postal"
                value={address.postal_code}
                onChange={(e) => set("postal_code", e.target.value)}
                placeholder={t("address.example.postalCode")}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="org-country" className="text-muted-foreground text-xs">
                {t("address.country")}
              </Label>
              <Input
                id="org-country"
                value={address.country}
                onChange={(e) => set("country", e.target.value)}
                placeholder={t("address.example.country")}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-muted-foreground text-xs">{tc("owner")}</Label>
            <OwnerSelect value={owner} onChange={setOwner} />
          </div>

          <DialogFooter className="mt-1">
            <DialogClose render={<Button variant="outline" type="button" />}>
              {tc("cancel")}
            </DialogClose>
            <Button
              type="submit"
              className="ibl-button-primary"
              disabled={!name.trim() || isLoading}
            >
              {isLoading ? <Spinner size="sm" className="size-4 text-current" /> : null}
              {t("dialog.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
