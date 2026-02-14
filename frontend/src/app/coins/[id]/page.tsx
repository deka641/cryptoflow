"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Coin, CoinHistory } from "@/types";
import { PriceChart } from "@/components/charts/PriceChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, DollarSign, BarChart3, Activity, Coins } from "lucide-react";

const TIME_PERIODS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

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

function formatSupply(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

const statCardAccents = [
  { border: "border-l-indigo-500", iconBg: "bg-indigo-500/15 text-indigo-400" },
  { border: "border-l-emerald-500", iconBg: "bg-emerald-500/15 text-emerald-400" },
  { border: "border-l-amber-500", iconBg: "bg-amber-500/15 text-amber-400" },
  { border: "border-l-cyan-500", iconBg: "bg-cyan-500/15 text-cyan-400" },
];

export default function CoinDetailPage() {
  const params = useParams();
  const coinId = Number(params.id);
  const [coin, setCoin] = useState<Coin | null>(null);
  const [history, setHistory] = useState<CoinHistory | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);

  const fetchCoin = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.getCoin(coinId);
      setCoin(result);
    } catch {
      // handle error silently
    } finally {
      setLoading(false);
    }
  }, [coinId]);

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const result = await api.getCoinHistory(coinId, days);
      setHistory(result);
    } catch {
      // handle error silently
    } finally {
      setHistoryLoading(false);
    }
  }, [coinId, days]);

  useEffect(() => {
    fetchCoin();
  }, [fetchCoin]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const chartData =
    history?.prices
      .filter((p) => p.price_usd !== null)
      .map((p) => ({
        timestamp: p.timestamp,
        price: p.price_usd as number,
      })) ?? [];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 bg-slate-700" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl bg-slate-700" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-xl bg-slate-700" />
      </div>
    );
  }

  if (!coin) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-slate-500">
        <p>Coin not found</p>
        <Button variant="outline" asChild className="border-slate-700 text-slate-300">
          <Link href="/market">
            <ArrowLeft className="size-4 mr-1" />
            Back to Market
          </Link>
        </Button>
      </div>
    );
  }

  const stats = [
    { label: "Price", value: formatPrice(coin.price_usd), icon: <DollarSign className="size-5" />, tooltip: "Current USD price from the latest 10-minute market data snapshot." },
    { label: "Market Cap", value: formatCompact(coin.market_cap), icon: <BarChart3 className="size-5" />, tooltip: "Total market value: current price × circulating supply." },
    { label: "24h Volume", value: formatCompact(coin.total_volume), icon: <Activity className="size-5" />, tooltip: "Total trading volume for this coin in the last 24 hours." },
    { label: "Circulating Supply", value: formatSupply(coin.circulating_supply), icon: <Coins className="size-5" />, tooltip: "Number of coins currently available on the market." },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="text-slate-400 hover:text-white">
          <Link href="/market">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          {coin.image_url ? (
            <img src={coin.image_url} alt={coin.name} className="size-10 rounded-full" />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-full bg-slate-700 text-lg font-bold text-slate-300">
              {coin.symbol[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">{coin.name}</h1>
            <p className="text-sm text-slate-400 uppercase">{coin.symbol}</p>
          </div>
        </div>
        {coin.price_change_24h_pct !== null && (
          <span
            className={`ml-2 rounded-full px-3 py-1 text-sm font-medium border ${
              coin.price_change_24h_pct >= 0
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}
          >
            {coin.price_change_24h_pct >= 0 ? "+" : ""}
            {coin.price_change_24h_pct.toFixed(2)}%
          </span>
        )}
      </div>

      {/* Key Metrics */}
      <p className="text-sm text-slate-400">
        Key metrics from the latest market data snapshot. Market cap and volume are sourced from CoinGecko, while the price history chart below is built from our star-schema fact table with data points captured every 10 minutes.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, i) => {
          const accent = statCardAccents[i];
          return (
            <Tooltip key={stat.label}>
              <TooltipTrigger asChild>
                <Card className={`glass-card border-l-[3px] ${accent.border}`}>
                  <CardContent className="flex items-center gap-3">
                    <div className={`flex size-10 items-center justify-center rounded-lg ${accent.iconBg}`}>
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">{stat.label}</p>
                      <p className="text-lg font-bold text-white">
                        {stat.value}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                sideOffset={6}
                className="max-w-xs border border-slate-700/50 bg-slate-800/95 backdrop-blur-md text-slate-300 shadow-xl shadow-black/20"
              >
                {stat.tooltip}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Price Chart */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white">Price History</CardTitle>
            <p className="text-xs text-slate-400 mt-1">
              Historical price data from our PostgreSQL fact table. Select a timeframe to zoom in or out.
            </p>
          </div>
          <div className="flex gap-1">
            {TIME_PERIODS.map((period) => (
              <Button
                key={period.days}
                variant={days === period.days ? "default" : "ghost"}
                size="sm"
                onClick={() => setDays(period.days)}
                className={
                  days === period.days
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "text-slate-400 hover:text-white hover:bg-slate-700"
                }
              >
                {period.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <Skeleton className="h-80 w-full rounded-lg bg-slate-700" />
          ) : (
            <PriceChart data={chartData} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
