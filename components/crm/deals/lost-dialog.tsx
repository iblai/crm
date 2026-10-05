"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@iblai/iblai-js/web-containers";

// The shown label is what gets saved as `lost_reason`.
const SUGGESTIONS = ["price", "competitor", "noBudget", "noDecision", "badTiming"] as const;

/** Closing a deal as lost always asks why — the API requires a reason. */
export function LostDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
  title,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void | Promise<void>;
  loading?: boolean;
  title?: string;
  description?: string;
}) {
  const t = useTranslations("deals");
  const tc = useTranslations("common");
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title ?? t("lost.title")}</DialogTitle>
          <DialogDescription>{description ?? t("lost.description")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="lost-reason">{t("lost.reason")}</Label>
          <Textarea
            id="lost-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("lost.reasonPlaceholder")}
          />
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((key) => {
              const label = t(`lost.suggestions.${key}`);
              return (
                <Button key={key} variant="outline" size="xs" onClick={() => setReason(label)}>
                  {label}
                </Button>
              );
            })}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || loading}
            onClick={() => void onConfirm(reason.trim())}
          >
            {loading ? <Spinner size="sm" className="size-4 text-current" /> : null}
            {t("actions.markLost")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
