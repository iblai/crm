"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@iblai/iblai-js/web-containers";
import { TagChip } from "@/components/crm/tag-chip";
import { TagColorSwatches, isValidHex } from "@/components/crm/tags/tag-color-picker";
import { errorMessage, errorStatus, useCreateTagMutation } from "@/lib/crm/api";
import type { Tag } from "@/lib/crm/types";

/** Create a tag: a name (unique per organization) and a colour. */
export function TagDialog({
  open,
  onOpenChange,
  defaultColor = "#0058cc",
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultColor?: string;
  onCreated?: (tag: Tag) => void;
}) {
  const t = useTranslations("tags");
  const tc = useTranslations("common");
  const [create, { isLoading }] = useCreateTagMutation();
  const [name, setName] = useState("");
  const [color, setColor] = useState(defaultColor);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setColor(defaultColor);
    setTouched(false);
  }, [open, defaultColor]);

  const nameMissing = !name.trim();
  const colorInvalid = !isValidHex(color);

  const submit = async () => {
    setTouched(true);
    if (nameMissing || colorInvalid) return;
    try {
      const tag = await create({ name: name.trim(), color }).unwrap();
      toast.success(t("dialog.created", { name: tag.name }));
      onCreated?.(tag);
      onOpenChange(false);
    } catch (err) {
      toast.error(
        errorStatus(err) === 403 ? tc("errorForbidden") : errorMessage(err, tc("errorGeneric")),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className="p-4 pb-3">
          <DialogTitle>{t("newTag")}</DialogTitle>
          <DialogDescription>{t("dialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 px-4 pb-4">
          <div className="grid gap-1.5">
            <Label htmlFor="tag-name" className="text-muted-foreground text-xs">
              {tc("name")}
            </Label>
            <Input
              id="tag-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submit();
                }
              }}
              placeholder={t("dialog.namePlaceholder")}
              className="h-8 text-sm"
              aria-invalid={touched && nameMissing}
            />
            {touched && nameMissing ? (
              <p className="text-[11px] text-rose-600">{t("dialog.nameRequired")}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label className="text-muted-foreground text-xs">{t("dialog.colorLabel")}</Label>
            <TagColorSwatches color={color} onChange={setColor} />
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-[#fafbfc] px-3 py-2.5">
            <span className="text-muted-foreground text-[11px]">{t("dialog.preview")}</span>
            <TagChip tag={{ name: name.trim() || t("dialog.previewPlaceholder"), color }} />
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 rounded-b-xl">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {tc("cancel")}
          </Button>
          <Button className="ibl-button-primary" onClick={() => void submit()} disabled={isLoading}>
            {isLoading ? <Spinner size="sm" className="size-4 text-current" /> : null}
            {t("dialog.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
