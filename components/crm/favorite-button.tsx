"use client";

import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  errorMessage,
  useAddFavoriteMutation,
  useListFavoritesQuery,
  useRemoveFavoriteMutation,
} from "@/lib/crm/api";
import type { Favorite, FavoriteInput } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

function matches(favorite: Favorite, target: FavoriteInput) {
  if ("person" in target) return favorite.person === target.person;
  if ("organization" in target) return favorite.organization === target.organization;
  return favorite.deal === target.deal;
}

/** Star / unstar one record; the star lands in the sidebar's Favorites. */
export function FavoriteButton({
  target,
  className,
}: {
  target: FavoriteInput;
  className?: string;
}) {
  const t = useTranslations("favorites");
  const tc = useTranslations("common");
  const { data, error } = useListFavoritesQuery(target);
  const [add, { isLoading: adding }] = useAddFavoriteMutation();
  const [remove, { isLoading: removing }] = useRemoveFavoriteMutation();
  const existing = data?.results.find((f) => matches(f, target));
  const busy = adding || removing;

  const toggle = async () => {
    try {
      if (existing) await remove(existing.id).unwrap();
      else await add(target).unwrap();
    } catch (err) {
      toast.error(errorMessage(err, tc("errorGeneric")));
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            onClick={() => void toggle()}
            disabled={busy || !!error}
            aria-pressed={!!existing}
            aria-label={existing ? t("remove") : t("add")}
            className={className}
          />
        }
      >
        <Star
          strokeWidth={1.75}
          className={cn("size-4 text-[#5f5f61]", existing && "fill-current")}
        />
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {error ? errorMessage(error, tc("errorGeneric")) : existing ? t("remove") : t("add")}
      </TooltipContent>
    </Tooltip>
  );
}
