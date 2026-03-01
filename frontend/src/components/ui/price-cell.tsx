"use client";

import { TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { usePriceFlash } from "@/hooks/use-price-flash";

interface PriceCellProps {
  id: number | string;
  livePrice?: number;
  fallbackPrice: number | null;
}

export function PriceCell({ id, livePrice, fallbackPrice }: PriceCellProps) {
  const { displayPrice, flash, flashKey } = usePriceFlash(livePrice, fallbackPrice);

  return (
    <TableCell
      className={cn(
        "text-right font-medium text-white transition-colors duration-300",
        flash === "green" && "animate-[flash-green_0.6s_ease-out]",
        flash === "red" && "animate-[flash-red_0.6s_ease-out]"
      )}
      key={flash ? `${id}-${flashKey}` : String(id)}
    >
      {formatCurrency(displayPrice)}
    </TableCell>
  );
}
