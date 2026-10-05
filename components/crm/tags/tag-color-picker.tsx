"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** The brand-adjacent palette new tags cycle through. */
export const TAG_PALETTE = [
  "#0058cc",
  "#00b0ef",
  "#0891b2",
  "#059669",
  "#65a30d",
  "#f59e0b",
  "#ea580c",
  "#dc2626",
  "#db2777",
  "#7c3aed",
  "#4f46e5",
  "#64748b",
];

export const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidHex(value: string): boolean {
  return HEX_RE.test(value);
}

/** The palette colour a newly created tag gets, cycling by position. */
export function nextTagColor(index: number): string {
  return TAG_PALETTE[index % TAG_PALETTE.length];
}

/** A grid of palette swatches plus a free-form hex field. */
export function TagColorSwatches({
  color,
  onChange,
  className,
}: {
  color: string;
  onChange: (color: string) => void;
  className?: string;
}) {
  const t = useTranslations("tags");
  const [hex, setHex] = useState(color);

  useEffect(() => setHex(color), [color]);

  const hexValid = isValidHex(hex);

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <div className="grid grid-cols-6 gap-1.5">
        {TAG_PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={t("colorPicker.use", { color: c })}
            className={cn(
              "flex size-7 items-center justify-center rounded-lg ring-1 ring-black/10 transition-transform hover:scale-105",
              c.toLowerCase() === color.toLowerCase() && "ring-2 ring-gray-900 ring-offset-1",
            )}
            style={{ backgroundColor: c }}
          >
            {c.toLowerCase() === color.toLowerCase() ? (
              <Check className="size-3.5 text-white" strokeWidth={2.5} />
            ) : null}
          </button>
        ))}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="tag-hex" className="text-muted-foreground text-xs">
          {t("colorPicker.customHex")}
        </Label>
        <Input
          id="tag-hex"
          value={hex}
          onChange={(e) => {
            const v = e.target.value;
            setHex(v);
            if (isValidHex(v)) onChange(v);
          }}
          placeholder="#0058cc"
          spellCheck={false}
          aria-invalid={!hexValid}
          className="h-8 font-mono text-sm"
        />
        {!hexValid ? (
          <p className="text-[11px] text-rose-600">{t("colorPicker.invalidHex")}</p>
        ) : null}
      </div>
    </div>
  );
}

/** Swatch button that opens the palette in a popover. */
export function TagColorPicker({
  color,
  onChange,
  disabled,
  size = "md",
  label,
}: {
  color: string;
  onChange: (color: string) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  label?: string;
}) {
  const t = useTranslations("tags");
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              disabled={disabled}
              aria-label={label ?? t("colorPicker.change")}
              className={cn(
                "shrink-0 rounded-lg ring-1 ring-black/10 transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-[#0058cc] disabled:cursor-not-allowed disabled:opacity-60",
                size === "sm" ? "size-5" : "size-7",
              )}
              style={{ backgroundColor: isValidHex(color) ? color : "#888888" }}
            />
          }
        />
        <TooltipContent>{t("colorPicker.change")}</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-60" align="start">
        <TagColorSwatches color={color} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}
