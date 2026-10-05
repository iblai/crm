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
import { SearchPicker } from "@/components/crm/search-picker";
import { SimpleSelect } from "@/components/crm/simple-select";
import { OwnerSelect } from "@/components/crm/owner-select";
import { useToastApiError } from "@/components/crm/people/crm-error";
import { useSession } from "@/hooks/use-session";
import { useCreatePersonMutation } from "@/lib/crm/api";
import { useCrmEnums } from "@/lib/crm/i18n";
import type { LifecycleStage, Person } from "@/lib/crm/types";

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
  const t = useTranslations("people");
  const tc = useTranslations("common");
  const { lifecycleOptions } = useCrmEnums();
  const toastApiError = useToastApiError();
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const { href, userId } = useSession();
  const [createPerson, { isLoading }] = useCreatePersonMutation();

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
      toast.success(t("dialog.added", { name: person.name }));
      onOpenChange(false);
      onCreated?.(person);
      if (navigateOnCreate) router.push(href(`/people/${person.id}`));
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
            <Label htmlFor="person-name" className="text-muted-foreground text-xs">
              {tc("name")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="person-name"
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("dialog.namePlaceholder")}
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="person-email" className="text-muted-foreground text-xs">
              {tc("email")}
            </Label>
            <Input
              id="person-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("dialog.emailPlaceholder")}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="person-title" className="text-muted-foreground text-xs">
              {t("fields.jobTitle")}
            </Label>
            <Input
              id="person-title"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder={t("dialog.jobTitlePlaceholder")}
            />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-muted-foreground text-xs">{t("fields.company")}</Label>
            <SearchPicker
              kind="organization"
              value={organization || null}
              onChange={(id) => setOrganization(id ?? "")}
              placeholder={t("fields.noCompany")}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label className="text-muted-foreground text-xs">{t("fields.lifecycleStage")}</Label>
              <SimpleSelect
                value={lifecycle}
                onChange={(v) => setLifecycle((v || "lead") as LifecycleStage)}
                options={lifecycleOptions}
                aria-label={t("fields.lifecycleStage")}
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-muted-foreground text-xs">{tc("owner")}</Label>
              <OwnerSelect value={owner} onChange={setOwner} />
            </div>
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
