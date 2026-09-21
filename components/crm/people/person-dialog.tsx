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
import { SimpleSelect } from "@/components/crm/simple-select";
import { OwnerSelect } from "@/components/crm/owner-select";
import { toastApiError } from "@/components/crm/people/crm-error";
import { useSession } from "@/hooks/use-session";
import { useCreatePersonMutation, useListOrganizationsQuery } from "@/lib/crm/api";
import { LIFECYCLE_STAGES, type LifecycleStage, type Person } from "@/lib/crm/types";

/**
 * Create a person. Opened from the People list ("New person", `?new=1`) and
 * from an organization's People tab, where `defaultOrganization` pre-fills
 * the company so the record lands in the right place.
 */
export function PersonDialog({
  open,
  onOpenChange,
  defaultOrganization,
  navigateOnCreate = true,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultOrganization?: string | null;
  /** Go to the new person's page on success (default). */
  navigateOnCreate?: boolean;
  onCreated?: (person: Person) => void;
}) {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const { href, userId } = useSession();
  const [createPerson, { isLoading }] = useCreatePersonMutation();
  const { data: orgs } = useListOrganizationsQuery({ page_size: 100 }, { skip: !open });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [organization, setOrganization] = useState(defaultOrganization ?? "");
  const [lifecycle, setLifecycle] = useState<LifecycleStage>("lead");
  const [owner, setOwner] = useState<number | null>(userId ?? null);

  // Fresh form every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setName("");
    setEmail("");
    setJobTitle("");
    setOrganization(defaultOrganization ?? "");
    setLifecycle("lead");
    setOwner(userId ?? null);
  }, [open, defaultOrganization, userId]);

  const orgOptions = (orgs?.results ?? []).map((o) => ({ value: o.id, label: o.name }));

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const person = await createPerson({
        name: trimmed,
        primary_email: email.trim() || undefined,
        job_title: jobTitle.trim() || undefined,
        organization: organization || null,
        lifecycle_stage: lifecycle,
        owner: owner ?? null,
      }).unwrap();
      toast.success(`${person.name} added`);
      onOpenChange(false);
      onCreated?.(person);
      if (navigateOnCreate) router.push(href(`/people/${person.id}`));
    } catch (err) {
      toastApiError(err, "Could not create this person");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" initialFocus={nameRef}>
        <DialogHeader>
          <DialogTitle>New person</DialogTitle>
          <DialogDescription>
            Add a contact to the CRM. You can fill in the rest on their record.
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
            <Label htmlFor="person-name" className="text-muted-foreground text-xs">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="person-name"
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ada Lovelace"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="person-email" className="text-muted-foreground text-xs">
              Email
            </Label>
            <Input
              id="person-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ada@example.com"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="person-title" className="text-muted-foreground text-xs">
              Job title
            </Label>
            <Input
              id="person-title"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Head of Learning"
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-muted-foreground text-xs">Organization</Label>
            <SimpleSelect
              value={organization}
              onChange={setOrganization}
              options={orgOptions}
              allowEmpty
              emptyLabel="No organization"
              placeholder="No organization"
              aria-label="Organization"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-muted-foreground text-xs">Lifecycle stage</Label>
              <SimpleSelect
                value={lifecycle}
                onChange={(v) => setLifecycle((v || "lead") as LifecycleStage)}
                options={LIFECYCLE_STAGES}
                aria-label="Lifecycle stage"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-muted-foreground text-xs">Owner</Label>
              <OwnerSelect value={owner} onChange={setOwner} />
            </div>
          </div>

          <DialogFooter className="mt-1">
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button
              type="submit"
              className="ibl-button-primary"
              disabled={!name.trim() || isLoading}
            >
              {isLoading ? <Spinner data-icon="inline-start" /> : null}
              Create person
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
