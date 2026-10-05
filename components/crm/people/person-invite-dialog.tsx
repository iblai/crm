"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { useToastApiError } from "@/components/crm/people/crm-error";
import { errorStatus, useInvitePersonMutation } from "@/lib/crm/api";
import type { Person } from "@/lib/crm/types";

/**
 * Invite a person to the platform: sends the ibl.ai invitation to their
 * primary email and links the account back to this record once accepted.
 */
export function PersonInviteDialog({
  open,
  onOpenChange,
  person,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: Person;
}) {
  const t = useTranslations("people");
  const toastApiError = useToastApiError();
  const [invite, { isLoading }] = useInvitePersonMutation();
  const [asAdmin, setAsAdmin] = useState(false);

  useEffect(() => {
    if (open) setAsAdmin(false);
  }, [open]);

  const confirm = async () => {
    try {
      const res = await invite({ id: person.id, body: { is_admin: asAdmin } }).unwrap();
      onOpenChange(false);
      toast.success(
        t("invite.sent", { email: res.invitation_email || person.primary_email || "" }),
      );
    } catch (err) {
      const status = errorStatus(err);
      if (status === 409) {
        toast.error(t("invite.exists"));
        return;
      }
      if (status === 422) {
        toast.error(t("invite.alreadyLinked"));
        return;
      }
      toastApiError(err, t("invite.error"));
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("invite.title", { name: person.name })}
      description={
        <>
          <span className="block">
            {t.rich("invite.body", {
              email: person.primary_email ?? "",
              b: (chunks) => <span className="font-medium text-gray-900">{chunks}</span>,
            })}
          </span>
          <label
            htmlFor="invite-as-admin"
            className="mt-3 inline-flex items-center gap-2 text-sm text-gray-900"
          >
            <Checkbox
              id="invite-as-admin"
              checked={asAdmin}
              onCheckedChange={(checked) => setAsAdmin(checked)}
              disabled={isLoading}
            />
            {t("invite.asAdmin")}
          </label>
        </>
      }
      confirmLabel={t("invite.submit")}
      loading={isLoading}
      onConfirm={confirm}
    />
  );
}
