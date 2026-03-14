"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { PriceCell } from "@/components/ui/price-cell";
import { cn } from "@/lib/utils";
import { SparklineChart } from "@/components/charts/SparklineChart";
import { Skeleton } from "@/components/ui/skeleton";
import type { Coin } from "@/types";
import { ArrowUpDown, ArrowUp, ArrowDown, Star } from "lucide-react";
import { formatCompactCurrency, formatPercentage } from "@/lib/formatters";

interface MarketTableProps {
  coins: Coin[];
  livePrices?: Record<string, number>;
  sparklines?: Record<number, number[]>;
  sparklinesLoading?: boolean;
  onToggleWatchlist?: (coinId: number) => void;
  isWatched?: (coinId: number) => boolean;
  onSortChange?: (field: SortField, direction: SortDirection) => void;
  serverSort?: boolean;
}

type SortField =
  | "market_cap_rank"
  | "name"
  | "price_usd"
  | "price_change_24h_pct"
  | "market_cap"
  | "total_volume";

type SortDirection = "asc" | "desc";

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
  onSortChange,
  serverSort,
}: MarketTableProps) {
  const [sortField, setSortField] = useState<SortField>("market_cap_rank");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (field: SortField) => {
    let newDir: SortDirection;
    if (sortField === field) {
      newDir = sortDirection === "asc" ? "desc" : "asc";
    } else {
      newDir = field === "market_cap_rank" ? "asc" : "desc";
    }
    setSortField(field);
    setSortDirection(newDir);
    onSortChange?.(field, newDir);
  };

  const sortedCoins = useMemo(() => {
    if (serverSort) return coins;
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
  }, [coins, sortField, sortDirection, serverSort]);

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
                      width={24}
                      height={24}
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
              <PriceCell id={coin.id} livePrice={livePrice} fallbackPrice={coin.price_usd} />
              <TableCell
                className={cn(
                  "text-right font-medium",
                  change !== null && change >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                )}
              >
                {formatPercentage(change)}
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
                {formatCompactCurrency(coin.market_cap)}
              </TableCell>
              <TableCell className="text-right text-slate-300 hidden lg:table-cell">
                {formatCompactCurrency(coin.total_volume)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
