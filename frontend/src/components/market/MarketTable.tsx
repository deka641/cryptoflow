"use client";

import { useState, useMemo, useEffect } from "react";
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
import { SparklineChart } from "@/components/charts/SparklineChart";
import { Skeleton } from "@/components/ui/skeleton";
import type { Coin } from "@/types";
import { ArrowUpDown, ArrowUp, ArrowDown, Star } from "lucide-react";

interface MarketTableProps {
  coins: Coin[];
  livePrices?: Record<string, number>;
  sparklines?: Record<number, number[]>;
  sparklinesLoading?: boolean;
  onToggleWatchlist?: (coinId: number) => void;
  isWatched?: (coinId: number) => boolean;
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
  const [prevLivePrice, setPrevLivePrice] = useState(livePrice);
  const [flash, setFlash] = useState<"green" | "red" | null>(null);
  const [flashKey, setFlashKey] = useState(0);

  // Adjust state during render (React recommended pattern for prop-derived state)
  if (livePrice !== prevLivePrice) {
    setPrevLivePrice(livePrice);
    if (livePrice !== undefined && prevLivePrice !== undefined) {
      setFlash(livePrice > prevLivePrice ? "green" : "red");
      setFlashKey((k) => k + 1);
    }
  }

  // Clear flash after animation completes
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
      key={flash ? `${coin.id}-${flashKey}` : coin.id}
    >
      {formatPrice(displayPrice)}
    </TableCell>
  );
}

function SortIcon({
  field,
  sortField,
  sortDirection,
}: {
  field: SortField;
  sortField: SortField;
  sortDirection: SortDirection;
}) {
  if (sortField !== field) return <ArrowUpDown className="size-3.5 text-slate-500" />;
  return sortDirection === "asc" ? (
    <ArrowUp className="size-3.5 text-white" />
  ) : (
    <ArrowDown className="size-3.5 text-white" />
  );
}

export function MarketTable({
  coins,
  livePrices,
  sparklines,
  sparklinesLoading,
  onToggleWatchlist,
  isWatched,
}: MarketTableProps) {
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

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-slate-700 hover:bg-transparent bg-slate-800/30">
          {onToggleWatchlist && (
            <TableHead className="w-10" />
          )}
          <TableHead
            className="cursor-pointer select-none w-16"
            onClick={() => handleSort("market_cap_rank")}
          >
            <span className="flex items-center gap-1">
              # <SortIcon field="market_cap_rank" sortField={sortField} sortDirection={sortDirection} />
            </span>
          </TableHead>
          <TableHead
            className="cursor-pointer select-none"
            onClick={() => handleSort("name")}
          >
            <span className="flex items-center gap-1">
              Coin <SortIcon field="name" sortField={sortField} sortDirection={sortDirection} />
            </span>
          </TableHead>
          <TableHead
            className="cursor-pointer select-none text-right"
            onClick={() => handleSort("price_usd")}
          >
            <span className="flex items-center justify-end gap-1">
              Price <SortIcon field="price_usd" sortField={sortField} sortDirection={sortDirection} />
            </span>
          </TableHead>
          <TableHead
            className="cursor-pointer select-none text-right"
            onClick={() => handleSort("price_change_24h_pct")}
          >
            <span className="flex items-center justify-end gap-1">
              24h% <SortIcon field="price_change_24h_pct" sortField={sortField} sortDirection={sortDirection} />
            </span>
          </TableHead>
          <TableHead className="text-center hidden md:table-cell w-[140px]">
            7d
          </TableHead>
          <TableHead
            className="cursor-pointer select-none text-right hidden md:table-cell"
            onClick={() => handleSort("market_cap")}
          >
            <span className="flex items-center justify-end gap-1">
              Market Cap <SortIcon field="market_cap" sortField={sortField} sortDirection={sortDirection} />
            </span>
          </TableHead>
          <TableHead
            className="cursor-pointer select-none text-right hidden lg:table-cell"
            onClick={() => handleSort("total_volume")}
          >
            <span className="flex items-center justify-end gap-1">
              Volume <SortIcon field="total_volume" sortField={sortField} sortDirection={sortDirection} />
            </span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedCoins.map((coin) => {
          const livePrice = livePrices?.[coin.coingecko_id];
          const change = coin.price_change_24h_pct;
          const sparkData = sparklines?.[coin.id];
          const watched = isWatched?.(coin.id) ?? false;

          return (
            <TableRow
              key={coin.id}
              className="border-slate-800 hover:bg-slate-700/30 transition-colors duration-200"
            >
              {onToggleWatchlist && (
                <TableCell className="w-10 pr-0">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onToggleWatchlist(coin.id);
                    }}
                    className="flex items-center justify-center hover:scale-110 transition-transform"
                    aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
                  >
                    <Star
                      className={cn(
                        "size-4 transition-colors",
                        watched
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-slate-600 hover:text-slate-400"
                      )}
                    />
                  </button>
                </TableCell>
              )}
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
              <TableCell className="hidden md:table-cell">
                <div className="flex justify-center">
                  {sparklinesLoading ? (
                    <Skeleton className="h-10 w-[120px] bg-slate-700" />
                  ) : sparkData && sparkData.length > 0 ? (
                    <SparklineChart data={sparkData} />
                  ) : (
                    <span className="text-slate-600 text-xs">-</span>
                  )}
                </div>
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
