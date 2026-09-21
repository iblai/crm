"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Spinner } from "@/components/ui/spinner";
import { OwnerSelect } from "@/components/crm/owner-select";
import { toastApiError } from "@/components/crm/people/crm-error";
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
      toast.success(`${organization.name} added`);
      onOpenChange(false);
      onCreated?.(organization);
      if (navigateOnCreate) router.push(href(`/organizations/${organization.id}`));
    } catch (err) {
      toastApiError(err, "Could not create this organization");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" initialFocus={nameRef}>
        <DialogHeader>
          <DialogTitle>New organization</DialogTitle>
          <DialogDescription>
            Companies group the people you talk to and the deals you run with them.
          </DialogDescription>
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
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="org-name"
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme University"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="org-street" className="text-muted-foreground text-xs">
              Street
            </Label>
            <Input
              id="org-street"
              value={address.street}
              onChange={(e) => set("street", e.target.value)}
              placeholder="1 Innovation Way"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="org-city" className="text-muted-foreground text-xs">
                City
              </Label>
              <Input
                id="org-city"
                value={address.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Boston"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="org-state" className="text-muted-foreground text-xs">
                State / region
              </Label>
              <Input
                id="org-state"
                value={address.state}
                onChange={(e) => set("state", e.target.value)}
                placeholder="MA"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="org-postal" className="text-muted-foreground text-xs">
                Postal code
              </Label>
              <Input
                id="org-postal"
                value={address.postal_code}
                onChange={(e) => set("postal_code", e.target.value)}
                placeholder="02110"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="org-country" className="text-muted-foreground text-xs">
                Country
              </Label>
              <Input
                id="org-country"
                value={address.country}
                onChange={(e) => set("country", e.target.value)}
                placeholder="United States"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-muted-foreground text-xs">Owner</Label>
            <OwnerSelect value={owner} onChange={setOwner} />
          </div>

          <DialogFooter className="mt-1">
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button
              type="submit"
              className="ibl-button-primary"
              disabled={!name.trim() || isLoading}
            >
              {isLoading ? <Spinner data-icon="inline-start" /> : null}
              Create organization
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
