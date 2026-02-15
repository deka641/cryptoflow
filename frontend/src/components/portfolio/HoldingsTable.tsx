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
import { cn } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";
import type { PortfolioHolding } from "@/types";

interface HoldingsTableProps {
  holdings: PortfolioHolding[];
  livePrices: Record<string, number>;
  onEdit: (holding: PortfolioHolding) => void;
  onDelete: (id: number) => void;
}

function formatPrice(price: number | null): string {
  if (price === null) return "-";
  if (price >= 1) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(price);
}

function formatQuantity(qty: number): string {
  if (qty >= 1) return qty.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return qty.toLocaleString("en-US", { maximumFractionDigits: 8 });
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
      {formatPrice(displayPrice)}
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
                {formatPrice(holding.buy_price_usd)}
              </TableCell>
              <PriceCell holding={holding} livePrice={livePrice} />
              <TableCell className="text-right font-medium text-white">
                {currentValue != null ? formatPrice(currentValue) : "-"}
              </TableCell>
              <TableCell className={cn("text-right font-medium", isPositive ? "text-emerald-400" : "text-red-400")}>
                {pnl != null ? `${isPositive ? "+" : ""}${formatPrice(pnl)}` : "-"}
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
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-slate-400 hover:text-red-400"
                    onClick={() => onDelete(holding.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
