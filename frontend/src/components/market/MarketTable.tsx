"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Coin } from "@/types";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface MarketTableProps {
  coins: Coin[];
  livePrices?: Record<string, number>;
}

type SortField =
  | "market_cap_rank"
  | "name"
  | "price_usd"
  | "price_change_24h_pct"
  | "market_cap"
  | "total_volume";

type SortDirection = "asc" | "desc";

function formatCompact(value: number | null): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
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

function PriceCell({ coin, livePrice }: { coin: Coin; livePrice?: number }) {
  const displayPrice = livePrice ?? coin.price_usd;
  const prevPriceRef = useRef(displayPrice);
  const [flash, setFlash] = useState<"green" | "red" | null>(null);

  useEffect(() => {
    if (livePrice !== undefined && prevPriceRef.current !== null && livePrice !== prevPriceRef.current) {
      setFlash(livePrice > prevPriceRef.current ? "green" : "red");
      const timer = setTimeout(() => setFlash(null), 600);
      prevPriceRef.current = livePrice;
      return () => clearTimeout(timer);
    }
    prevPriceRef.current = displayPrice;
  }, [livePrice, displayPrice]);

  return (
    <TableCell
      className={cn(
        "text-right font-medium text-white transition-colors duration-300",
        flash === "green" && "animate-[flash-green_0.6s_ease-out]",
        flash === "red" && "animate-[flash-red_0.6s_ease-out]"
      )}
      key={flash ? `${coin.id}-${Date.now()}` : coin.id}
    >
      {formatPrice(displayPrice)}
    </TableCell>
  );
}

export function MarketTable({ coins, livePrices }: MarketTableProps) {
  const [sortField, setSortField] = useState<SortField>("market_cap_rank");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "market_cap_rank" ? "asc" : "desc");
    }
  };

  const sortedCoins = useMemo(() => {
    return [...coins].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortDirection === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [coins, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="size-3.5 text-slate-500" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="size-3.5 text-white" />
    ) : (
      <ArrowDown className="size-3.5 text-white" />
    );
  };

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-slate-700 hover:bg-transparent bg-slate-800/30">
          <TableHead
            className="cursor-pointer select-none w-16"
            onClick={() => handleSort("market_cap_rank")}
          >
            <span className="flex items-center gap-1">
              # <SortIcon field="market_cap_rank" />
            </span>
          </TableHead>
          <TableHead
            className="cursor-pointer select-none"
            onClick={() => handleSort("name")}
          >
            <span className="flex items-center gap-1">
              Coin <SortIcon field="name" />
            </span>
          </TableHead>
          <TableHead
            className="cursor-pointer select-none text-right"
            onClick={() => handleSort("price_usd")}
          >
            <span className="flex items-center justify-end gap-1">
              Price <SortIcon field="price_usd" />
            </span>
          </TableHead>
          <TableHead
            className="cursor-pointer select-none text-right"
            onClick={() => handleSort("price_change_24h_pct")}
          >
            <span className="flex items-center justify-end gap-1">
              24h% <SortIcon field="price_change_24h_pct" />
            </span>
          </TableHead>
          <TableHead
            className="cursor-pointer select-none text-right hidden md:table-cell"
            onClick={() => handleSort("market_cap")}
          >
            <span className="flex items-center justify-end gap-1">
              Market Cap <SortIcon field="market_cap" />
            </span>
          </TableHead>
          <TableHead
            className="cursor-pointer select-none text-right hidden lg:table-cell"
            onClick={() => handleSort("total_volume")}
          >
            <span className="flex items-center justify-end gap-1">
              Volume <SortIcon field="total_volume" />
            </span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedCoins.map((coin) => {
          const livePrice = livePrices?.[coin.symbol];
          const change = coin.price_change_24h_pct;

          return (
            <TableRow
              key={coin.id}
              className="border-slate-800 hover:bg-slate-700/30 transition-colors duration-200"
            >
              <TableCell className="text-slate-400 font-medium">
                {coin.market_cap_rank ?? "-"}
              </TableCell>
              <TableCell>
                <Link
                  href={`/coins/${coin.id}`}
                  className="flex items-center gap-3 hover:underline"
                >
                  {coin.image_url ? (
                    <img
                      src={coin.image_url}
                      alt={coin.name}
                      className="size-6 rounded-full"
                    />
                  ) : (
                    <div className="flex size-6 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-300">
                      {coin.symbol[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-white">{coin.name}</p>
                    <p className="text-xs text-slate-400 uppercase">
                      {coin.symbol}
                    </p>
                  </div>
                </Link>
              </TableCell>
              <PriceCell coin={coin} livePrice={livePrice} />
              <TableCell
                className={cn(
                  "text-right font-medium",
                  change !== null && change >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                )}
              >
                {change !== null
                  ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`
                  : "-"}
              </TableCell>
              <TableCell className="text-right text-slate-300 hidden md:table-cell">
                {formatCompact(coin.market_cap)}
              </TableCell>
              <TableCell className="text-right text-slate-300 hidden lg:table-cell">
                {formatCompact(coin.total_volume)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
