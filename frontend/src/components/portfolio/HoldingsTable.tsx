"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { formatCurrency, formatQuantity } from "@/lib/formatters";
import { Pencil, Trash2 } from "lucide-react";
import type { PortfolioHolding } from "@/types";

interface HoldingsTableProps {
  holdings: PortfolioHolding[];
  livePrices: Record<string, number>;
  onEdit: (holding: PortfolioHolding) => void;
  onDelete: (id: number) => void;
}


function PriceCell({ holding, livePrice }: { holding: PortfolioHolding; livePrice?: number }) {
  const displayPrice = livePrice ?? holding.current_price_usd;
  const [prevLivePrice, setPrevLivePrice] = useState(livePrice);
  const [flash, setFlash] = useState<"green" | "red" | null>(null);
  const [flashKey, setFlashKey] = useState(0);

  if (livePrice !== prevLivePrice) {
    setPrevLivePrice(livePrice);
    if (livePrice !== undefined && prevLivePrice !== undefined) {
      setFlash(livePrice > prevLivePrice ? "green" : "red");
      setFlashKey((k) => k + 1);
    }
  }

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 600);
    return () => clearTimeout(timer);
  }, [flash]);

  return (
    <TableCell
      className={cn(
        "text-right font-medium text-white transition-colors duration-300",
        flash === "green" && "animate-[flash-green_0.6s_ease-out]",
        flash === "red" && "animate-[flash-red_0.6s_ease-out]"
      )}
      key={flash ? `${holding.id}-${flashKey}` : holding.id}
    >
      {formatCurrency(displayPrice)}
    </TableCell>
  );
}

export function HoldingsTable({ holdings, livePrices, onEdit, onDelete }: HoldingsTableProps) {
  if (holdings.length === 0) return null;

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-slate-700 hover:bg-transparent bg-slate-800/30">
          <TableHead>Coin</TableHead>
          <TableHead className="text-right hidden md:table-cell">Quantity</TableHead>
          <TableHead className="text-right hidden md:table-cell">Buy Price</TableHead>
          <TableHead className="text-right">Current Price</TableHead>
          <TableHead className="text-right">Value</TableHead>
          <TableHead className="text-right">P&L</TableHead>
          <TableHead className="text-right hidden sm:table-cell">P&L %</TableHead>
          <TableHead className="text-right w-20">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {holdings.map((holding) => {
          const livePrice = livePrices[holding.coingecko_id];
          const currentPrice = livePrice ?? holding.current_price_usd;
          const currentValue = currentPrice != null ? holding.quantity * currentPrice : null;
          const pnl = currentValue != null ? currentValue - holding.cost_basis_usd : null;
          const pnlPct = pnl != null && holding.cost_basis_usd > 0
            ? (pnl / holding.cost_basis_usd) * 100
            : null;
          const isPositive = pnl != null && pnl >= 0;

          return (
            <TableRow
              key={holding.id}
              className="border-slate-800 hover:bg-slate-700/30 transition-colors duration-200"
            >
              <TableCell>
                <Link href={`/coins/${holding.coin_id}`} className="flex items-center gap-3 hover:underline">
                  {holding.image_url ? (
                    <img src={holding.image_url} alt={holding.name} className="size-6 rounded-full" />
                  ) : (
                    <div className="flex size-6 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-300">
                      {holding.symbol[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-white">{holding.name}</p>
                    <p className="text-xs text-slate-400 uppercase">{holding.symbol}</p>
                  </div>
                </Link>
              </TableCell>
              <TableCell className="text-right text-slate-300 hidden md:table-cell">
                {formatQuantity(holding.quantity)}
              </TableCell>
              <TableCell className="text-right text-slate-300 hidden md:table-cell">
                {formatCurrency(holding.buy_price_usd)}
              </TableCell>
              <PriceCell holding={holding} livePrice={livePrice} />
              <TableCell className="text-right font-medium text-white">
                {currentValue != null ? formatCurrency(currentValue) : "-"}
              </TableCell>
              <TableCell className={cn("text-right font-medium", isPositive ? "text-emerald-400" : "text-red-400")}>
                {pnl != null ? `${isPositive ? "+" : ""}${formatCurrency(pnl)}` : "-"}
              </TableCell>
              <TableCell className={cn("text-right font-medium hidden sm:table-cell", isPositive ? "text-emerald-400" : "text-red-400")}>
                {pnlPct != null ? `${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%` : "-"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-slate-400 hover:text-white"
                    onClick={() => onEdit(holding)}
                    aria-label="Edit holding"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-slate-400 hover:text-red-400"
                        aria-label="Delete holding"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-slate-900 border-slate-700">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Remove {holding.name}?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                          This will permanently remove this holding from your portfolio. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(holding.id)}
                          className="bg-red-600 text-white hover:bg-red-700"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
