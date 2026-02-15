"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useLivePricesContext } from "@/providers/live-prices-provider";
import { useWatchlist } from "@/hooks/use-watchlist";
import type { Coin, CoinHistory, CoinOHLCV, CoinAnalytics } from "@/types";
import { PriceChart } from "@/components/charts/PriceChart";
import { CandlestickChart } from "@/components/charts/CandlestickChart";
import { RiskMetrics } from "@/components/coin-detail/RiskMetrics";
import { CorrelationInsights } from "@/components/coin-detail/CorrelationInsights";
import { CoinDescription } from "@/components/coin-detail/CoinDescription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  DollarSign,
  BarChart3,
  Activity,
  Coins,
  LineChart,
  ChevronLeft,
  ChevronRight,
  Star,
  GitCompareArrows,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TIME_PERIODS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "180d", days: 180 },
  { label: "1y", days: 365 },
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

// Live price cell with flash animation (same pattern as MarketTable PriceCell)
function LivePriceDisplay({ coin, livePrice }: { coin: Coin; livePrice?: number }) {
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
    <p
      key={flash ? `price-${flashKey}` : "price"}
      className={cn(
        "text-lg font-bold text-white transition-colors duration-300",
        flash === "green" && "animate-[flash-green_0.6s_ease-out]",
        flash === "red" && "animate-[flash-red_0.6s_ease-out]"
      )}
    >
      {formatPrice(displayPrice)}
    </p>
  );
}

export default function CoinDetailPage() {
  const params = useParams();
  const coinId = Number(params.id);
  const [coin, setCoin] = useState<Coin | null>(null);
  const [history, setHistory] = useState<CoinHistory | null>(null);
  const [ohlcv, setOhlcv] = useState<CoinOHLCV | null>(null);
  const [analytics, setAnalytics] = useState<CoinAnalytics | null>(null);
  const [coinList, setCoinList] = useState<Coin[]>([]);
  const [days, setDays] = useState(30);
  const [chartType, setChartType] = useState<"line" | "candle">("candle");
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [ohlcvLoading, setOhlcvLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const { prices } = useLivePricesContext();
  const { toggle, isWatched } = useWatchlist();

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

  const fetchOHLCV = useCallback(async () => {
    try {
      setOhlcvLoading(true);
      const result = await api.getCoinOHLCV(coinId, days);
      setOhlcv(result);
    } catch {
      // handle error silently
    } finally {
      setOhlcvLoading(false);
    }
  }, [coinId, days]);

  const fetchAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      const result = await api.getCoinAnalytics(coinId, 30);
      setAnalytics(result);
    } catch {
      // handle error silently
    } finally {
      setAnalyticsLoading(false);
    }
  }, [coinId]);

  const fetchCoinList = useCallback(async () => {
    try {
      const result = await api.getCoins(1, 50);
      setCoinList(result.items);
    } catch {
      // handle error silently
    }
  }, []);

  useEffect(() => {
    fetchCoin();
    fetchAnalytics();
    fetchCoinList();
  }, [fetchCoin, fetchAnalytics, fetchCoinList]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    fetchOHLCV();
  }, [fetchOHLCV]);

  // Prev/Next navigation based on market cap rank
  const { prevCoin, nextCoin } = useMemo(() => {
    if (!coin || coinList.length === 0) return { prevCoin: null, nextCoin: null };
    const sorted = [...coinList].sort(
      (a, b) => (a.market_cap_rank ?? 999) - (b.market_cap_rank ?? 999)
    );
    const idx = sorted.findIndex((c) => c.id === coin.id);
    return {
      prevCoin: idx > 0 ? sorted[idx - 1] : null,
      nextCoin: idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null,
    };
  }, [coin, coinList]);

  const livePrice = coin?.coingecko_id ? prices[coin.coingecko_id] : undefined;

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
    { label: "Price", value: null, icon: <DollarSign className="size-5" />, tooltip: "Current USD price from the latest 10-minute market data snapshot. Updates live via WebSocket.", isPrice: true },
    { label: "Market Cap", value: formatCompact(coin.market_cap), icon: <BarChart3 className="size-5" />, tooltip: "Total market value: current price x circulating supply.", isPrice: false },
    { label: "24h Volume", value: formatCompact(coin.total_volume), icon: <Activity className="size-5" />, tooltip: "Total trading volume for this coin in the last 24 hours.", isPrice: false },
    { label: "Circulating Supply", value: formatSupply(coin.circulating_supply), icon: <Coins className="size-5" />, tooltip: "Number of coins currently available on the market.", isPrice: false },
  ];

  return (
    <div className="space-y-6">
      {/* Navigation Bar: Back + Prev/Next */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="text-slate-400 hover:text-white">
          <Link href="/market">
            <ArrowLeft className="size-4 mr-1" />
            Back to Market
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          {prevCoin && (
            <Button variant="ghost" size="sm" asChild className="text-slate-400 hover:text-white">
              <Link href={`/coins/${prevCoin.id}`}>
                <ChevronLeft className="size-4 mr-0.5" />
                {prevCoin.symbol.toUpperCase()}
              </Link>
            </Button>
          )}
          {nextCoin && (
            <Button variant="ghost" size="sm" asChild className="text-slate-400 hover:text-white">
              <Link href={`/coins/${nextCoin.id}`}>
                {nextCoin.symbol.toUpperCase()}
                <ChevronRight className="size-4 ml-0.5" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        {coin.image_url ? (
          <img src={coin.image_url} alt={coin.name} className="size-12 rounded-full" />
        ) : (
          <div className="flex size-12 items-center justify-center rounded-full bg-slate-700 text-xl font-bold text-slate-300">
            {coin.symbol[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">{coin.name}</h1>
            <span className="text-sm text-slate-400 uppercase">{coin.symbol}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {coin.market_cap_rank && (
              <span className="rounded-full bg-slate-700/60 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                #{coin.market_cap_rank}
              </span>
            )}
            {coin.category && (
              <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-medium text-indigo-400">
                {coin.category}
              </span>
            )}
          </div>
        </div>

        {/* 24h Change Badge */}
        {coin.price_change_24h_pct !== null && (
          <span
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium border",
              coin.price_change_24h_pct >= 0
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            )}
          >
            {coin.price_change_24h_pct >= 0 ? "+" : ""}
            {coin.price_change_24h_pct.toFixed(2)}%
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggle(coin.id)}
                className={cn(
                  "text-slate-400 hover:text-white",
                  isWatched(coin.id) && "text-amber-400 hover:text-amber-300"
                )}
              >
                <Star className={cn("size-5", isWatched(coin.id) && "fill-current")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="border border-slate-700/50 bg-slate-800/95 backdrop-blur-md text-slate-300"
            >
              {isWatched(coin.id) ? "Remove from watchlist" : "Add to watchlist"}
            </TooltipContent>
          </Tooltip>
          <Button variant="outline" size="sm" asChild className="border-slate-700 text-slate-300 hover:text-white">
            <Link href={`/compare?coins=${coin.symbol.toUpperCase()}`}>
              <GitCompareArrows className="size-4 mr-1" />
              Compare
            </Link>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
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
                      {stat.isPrice ? (
                        <LivePriceDisplay coin={coin} livePrice={livePrice} />
                      ) : (
                        <p className="text-lg font-bold text-white">{stat.value}</p>
                      )}
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
              {chartType === "candle"
                ? "Daily OHLCV candlestick data aggregated from our star-schema fact table."
                : "Historical price data from our PostgreSQL fact table. Select a timeframe to zoom in or out."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-700/50 p-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setChartType("candle")}
                className={
                  chartType === "candle"
                    ? "bg-slate-700 text-white hover:bg-slate-600 h-7 px-2"
                    : "text-slate-400 hover:text-white hover:bg-transparent h-7 px-2"
                }
              >
                <BarChart3 className="size-3.5 mr-1" />
                Candle
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setChartType("line")}
                className={
                  chartType === "line"
                    ? "bg-slate-700 text-white hover:bg-slate-600 h-7 px-2"
                    : "text-slate-400 hover:text-white hover:bg-transparent h-7 px-2"
                }
              >
                <LineChart className="size-3.5 mr-1" />
                Line
              </Button>
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
          </div>
        </CardHeader>
        <CardContent>
          {chartType === "candle" ? (
            ohlcvLoading ? (
              <Skeleton className="h-96 w-full rounded-lg bg-slate-700" />
            ) : (
              <CandlestickChart data={ohlcv?.candles ?? []} />
            )
          ) : historyLoading ? (
            <Skeleton className="h-80 w-full rounded-lg bg-slate-700" />
          ) : (
            <PriceChart data={chartData} />
          )}
        </CardContent>
      </Card>

      {/* Risk Metrics */}
      <RiskMetrics
        volatility={analytics?.volatility}
        maxDrawdown={analytics?.max_drawdown}
        sharpeRatio={analytics?.sharpe_ratio}
        loading={analyticsLoading}
      />

      {/* Correlation Insights */}
      <CorrelationInsights
        mostCorrelated={analytics?.most_correlated ?? []}
        leastCorrelated={analytics?.least_correlated ?? []}
        loading={analyticsLoading}
      />

      {/* Coin Description */}
      <CoinDescription description={coin.description} />
    </div>
  );
}
