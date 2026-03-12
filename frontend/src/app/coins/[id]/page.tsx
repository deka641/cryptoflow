"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useLivePricesContext } from "@/providers/live-prices-provider";
import { useAuth } from "@/providers/auth-provider";
import { useWatchlist } from "@/hooks/use-watchlist";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useAlerts } from "@/hooks/use-alerts";
import { AddHoldingDialog } from "@/components/portfolio/AddHoldingDialog";
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
import { ErrorState } from "@/components/ui/error-state";
import { FadeIn } from "@/components/ui/fade-in";
import {
  ArrowLeft,
  Bell,
  DollarSign,
  BarChart3,
  Activity,
  Coins,
  LineChart,
  ChevronLeft,
  ChevronRight,
  Star,
  GitCompareArrows,
  Briefcase,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Layers,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatCompactCurrency, formatCurrency, formatSupply, formatPercentage } from "@/lib/formatters";
import { usePriceFlash } from "@/hooks/use-price-flash";

const TIME_PERIODS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "180d", days: 180 },
  { label: "1y", days: 365 },
];

const statCardAccents = [
  { border: "border-l-indigo-500", iconBg: "bg-indigo-500/15 text-indigo-400" },
  { border: "border-l-emerald-500", iconBg: "bg-emerald-500/15 text-emerald-400" },
  { border: "border-l-amber-500", iconBg: "bg-amber-500/15 text-amber-400" },
  { border: "border-l-cyan-500", iconBg: "bg-cyan-500/15 text-cyan-400" },
];

const extendedStatAccents = [
  { border: "border-l-emerald-500", iconBg: "bg-emerald-500/15 text-emerald-400" },
  { border: "border-l-red-500", iconBg: "bg-red-500/15 text-red-400" },
  { border: "border-l-violet-500", iconBg: "bg-violet-500/15 text-violet-400" },
  { border: "border-l-sky-500", iconBg: "bg-sky-500/15 text-sky-400" },
];

function LivePriceDisplay({ coin, livePrice }: { coin: Coin; livePrice?: number }) {
  const { displayPrice, flash, flashKey } = usePriceFlash(livePrice, coin.price_usd);

  return (
    <p
      key={flash ? `price-${flashKey}` : "price"}
      className={cn(
        "text-lg font-bold text-white transition-colors duration-300",
        flash === "green" && "animate-[flash-green_0.6s_ease-out]",
        flash === "red" && "animate-[flash-red_0.6s_ease-out]"
      )}
    >
      {formatCurrency(displayPrice)}
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
  const [volHistory, setVolHistory] = useState<{ period_days: number; volatility: number | null; max_drawdown: number | null; sharpe_ratio: number | null }[]>([]);
  const [coinError, setCoinError] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [ohlcvError, setOhlcvError] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(false);

  const { prices } = useLivePricesContext();
  const { user } = useAuth();
  const { toggle, isWatched } = useWatchlist();
  const { addHolding } = usePortfolio();
  const { createAlert } = useAlerts();
  const [portfolioDialogOpen, setPortfolioDialogOpen] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [alertPrice, setAlertPrice] = useState("");
  const [alertDirection, setAlertDirection] = useState<"above" | "below">("above");
  const [alertSaving, setAlertSaving] = useState(false);

  // Reset all data states when navigating to a different coin
  // to prevent showing stale data from the previous coin
  useEffect(() => {
    setCoin(null);
    setHistory(null);
    setOhlcv(null);
    setAnalytics(null);
    setLoading(true);
    setHistoryLoading(true);
    setOhlcvLoading(true);
    setAnalyticsLoading(true);
    setCoinError(false);
    setHistoryError(false);
    setOhlcvError(false);
    setAnalyticsError(false);
  }, [coinId]);

  const fetchCoin = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.getCoin(coinId);
      setCoin(result);
      setCoinError(false);
    } catch {
      setCoinError(true);
    } finally {
      setLoading(false);
    }
  }, [coinId]);

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const result = await api.getCoinHistory(coinId, days);
      setHistory(result);
      setHistoryError(false);
    } catch {
      setHistoryError(true);
    } finally {
      setHistoryLoading(false);
    }
  }, [coinId, days]);

  const fetchOHLCV = useCallback(async () => {
    try {
      setOhlcvLoading(true);
      const result = await api.getCoinOHLCV(coinId, days);
      setOhlcv(result);
      setOhlcvError(false);
    } catch {
      setOhlcvError(true);
    } finally {
      setOhlcvLoading(false);
    }
  }, [coinId, days]);

  const fetchAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsError(false);
      const result = await api.getCoinAnalytics(coinId, days);
      setAnalytics(result);
    } catch {
      setAnalyticsError(true);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [coinId, days]);

  const fetchCoinList = useCallback(async () => {
    try {
      const result = await api.getCoins(1, 50);
      setCoinList(result.items);
    } catch {
      // handle error silently
    }
  }, []);

  const fetchVolHistory = useCallback(async () => {
    try {
      const data = await api.getVolatilityHistory(coinId);
      setVolHistory(data.entries);
    } catch {
      setVolHistory([]);
    }
  }, [coinId]);

  useEffect(() => {
    fetchCoin();
    fetchAnalytics();
    fetchCoinList();
    fetchVolHistory();
  }, [fetchCoin, fetchAnalytics, fetchCoinList, fetchVolHistory]);

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

  if (coinError && !loading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild className="text-slate-400 hover:text-white">
          <Link href="/market">
            <ArrowLeft className="size-4 mr-1" />
            Back to Market
          </Link>
        </Button>
        <ErrorState message="Failed to load coin data" onRetry={fetchCoin} />
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
    { label: "Market Cap", value: formatCompactCurrency(coin.market_cap), icon: <BarChart3 className="size-5" />, tooltip: "Total market value: current price x circulating supply.", isPrice: false },
    { label: "24h Volume", value: formatCompactCurrency(coin.total_volume), icon: <Activity className="size-5" />, tooltip: "Total trading volume for this coin in the last 24 hours.", isPrice: false },
    { label: "Circulating Supply", value: formatSupply(coin.circulating_supply), icon: <Coins className="size-5" />, tooltip: "Number of coins currently available on the market.", isPrice: false },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        <Link href="/market" className="text-slate-400 hover:text-white transition-colors">
          Market
        </Link>
        <span className="text-slate-600">/</span>
        <span className="text-white font-medium">{coin.name} ({coin.symbol.toUpperCase()})</span>
      </nav>

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
          <img src={coin.image_url} alt={coin.name} width={48} height={48} className="size-12 rounded-full" />
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
            {formatPercentage(coin.price_change_24h_pct)}
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {user && (
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
          )}
          {user && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAlertPrice(coin.price_usd?.toString() ?? "");
                setAlertDialogOpen(true);
              }}
              className="border-slate-700 text-slate-300 hover:text-white"
            >
              <Bell className="size-4 mr-1" />
              Alert
            </Button>
          )}
          {user && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPortfolioDialogOpen(true)}
              className="border-slate-700 text-slate-300 hover:text-white"
            >
              <Briefcase className="size-4 mr-1" />
              Add to Portfolio
            </Button>
          )}
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

      {/* Extended Market Stats */}
      {(coin.ath != null || coin.high_24h != null || coin.total_supply != null) && (() => {
        const athPctFromAth = coin.ath && coin.price_usd
          ? ((coin.price_usd - coin.ath) / coin.ath) * 100
          : null;
        const extendedStats = [
          {
            label: "All-Time High",
            value: formatCurrency(coin.ath ?? null),
            sub: athPctFromAth != null ? `${athPctFromAth > 0 ? "+" : ""}${athPctFromAth.toFixed(1)}% from ATH` : coin.ath_date ? new Date(coin.ath_date).toLocaleDateString() : null,
            subColor: athPctFromAth != null ? (athPctFromAth >= 0 ? "text-emerald-400" : "text-red-400") : "text-slate-500",
            icon: <TrendingUp className="size-5" />,
            tooltip: "The highest price ever recorded for this coin, with percentage distance from current price.",
          },
          {
            label: "All-Time Low",
            value: formatCurrency(coin.atl ?? null),
            sub: coin.atl_date ? new Date(coin.atl_date).toLocaleDateString() : null,
            subColor: "text-slate-500",
            icon: <TrendingDown className="size-5" />,
            tooltip: "The lowest price ever recorded for this coin.",
          },
          {
            label: "24h Range",
            value: coin.high_24h != null && coin.low_24h != null
              ? `${formatCurrency(coin.low_24h)} — ${formatCurrency(coin.high_24h)}`
              : "-",
            sub: null,
            subColor: "text-slate-500",
            icon: <ArrowUpDown className="size-5" />,
            tooltip: "Price range for the last 24 hours (low — high).",
          },
          {
            label: "Supply",
            value: formatSupply(coin.circulating_supply ?? null),
            sub: coin.max_supply ? `Max: ${formatSupply(coin.max_supply)}` : coin.total_supply ? `Total: ${formatSupply(coin.total_supply)}` : null,
            subColor: "text-slate-500",
            icon: <Layers className="size-5" />,
            tooltip: "Circulating supply vs. total or maximum supply. Circulating = coins currently available on the market.",
          },
        ];
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {extendedStats.map((stat, i) => {
              const accent = extendedStatAccents[i];
              return (
                <Tooltip key={stat.label}>
                  <TooltipTrigger asChild>
                    <Card className={`glass-card border-l-[3px] ${accent.border}`}>
                      <CardContent className="flex items-center gap-3">
                        <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${accent.iconBg}`}>
                          {stat.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-slate-400">{stat.label}</p>
                          <p className="text-lg font-bold text-white truncate">{stat.value}</p>
                          {stat.sub && (
                            <p className={`text-xs ${stat.subColor} truncate`}>{stat.sub}</p>
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
        );
      })()}

      {/* Price Chart */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
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
            ) : ohlcvError ? (
              <ErrorState message="Failed to load OHLCV data" onRetry={fetchOHLCV} />
            ) : (
              <FadeIn>
                <CandlestickChart data={ohlcv?.candles ?? []} />
              </FadeIn>
            )
          ) : historyLoading ? (
            <Skeleton className="h-80 w-full rounded-lg bg-slate-700" />
          ) : historyError ? (
            <ErrorState message="Failed to load price history" onRetry={fetchHistory} />
          ) : (
            <FadeIn>
              <PriceChart data={chartData} />
            </FadeIn>
          )}
        </CardContent>
      </Card>

      {/* Risk Metrics */}
      {analyticsError ? (
        <ErrorState message="Failed to load analytics data" onRetry={fetchAnalytics} compact />
      ) : analyticsLoading ? (
        <RiskMetrics
          volatility={analytics?.volatility}
          maxDrawdown={analytics?.max_drawdown}
          sharpeRatio={analytics?.sharpe_ratio}
          loading={true}
          periodLabel={TIME_PERIODS.find((p) => p.days === days)?.label}
        />
      ) : (
        <FadeIn>
          <RiskMetrics
            volatility={analytics?.volatility}
            maxDrawdown={analytics?.max_drawdown}
            sharpeRatio={analytics?.sharpe_ratio}
            loading={false}
            periodLabel={TIME_PERIODS.find((p) => p.days === days)?.label}
          />
        </FadeIn>
      )}

      {/* Risk Metrics Across Periods */}
      {volHistory.length > 1 && (
        <FadeIn>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base">Risk Across Periods</CardTitle>
              <p className="text-xs text-slate-400 mt-1">
                Compare volatility, max drawdown, and Sharpe ratio across different time windows.
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left text-slate-400 font-medium py-2 pr-4">Period</th>
                      <th className="text-right text-slate-400 font-medium py-2 px-4">Volatility</th>
                      <th className="text-right text-slate-400 font-medium py-2 px-4">Max Drawdown</th>
                      <th className="text-right text-slate-400 font-medium py-2 px-4">Sharpe Ratio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {volHistory.map((entry) => (
                      <tr key={entry.period_days} className="border-b border-slate-800/50">
                        <td className="py-2 pr-4 text-slate-300 font-medium">{entry.period_days}d</td>
                        <td className="py-2 px-4 text-right">
                          <span className={cn(
                            "font-semibold",
                            entry.volatility !== null && entry.volatility < 3 ? "text-emerald-400" :
                            entry.volatility !== null && entry.volatility < 6 ? "text-amber-400" : "text-red-400"
                          )}>
                            {entry.volatility !== null ? `${(entry.volatility * 100).toFixed(1)}%` : "-"}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-right">
                          <span className={cn(
                            "font-semibold",
                            entry.max_drawdown !== null && entry.max_drawdown < 0.2 ? "text-emerald-400" :
                            entry.max_drawdown !== null && entry.max_drawdown < 0.4 ? "text-amber-400" : "text-red-400"
                          )}>
                            {entry.max_drawdown !== null ? `-${(entry.max_drawdown * 100).toFixed(1)}%` : "-"}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-right">
                          <span className={cn(
                            "font-semibold",
                            entry.sharpe_ratio !== null && entry.sharpe_ratio >= 1 ? "text-emerald-400" :
                            entry.sharpe_ratio !== null && entry.sharpe_ratio >= 0 ? "text-amber-400" : "text-red-400"
                          )}>
                            {entry.sharpe_ratio !== null ? entry.sharpe_ratio.toFixed(2) : "-"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Correlation Insights */}
      {analyticsError ? null : analyticsLoading ? (
        <CorrelationInsights
          mostCorrelated={analytics?.most_correlated ?? []}
          leastCorrelated={analytics?.least_correlated ?? []}
          loading={true}
        />
      ) : (
        <FadeIn>
          <CorrelationInsights
            mostCorrelated={analytics?.most_correlated ?? []}
            leastCorrelated={analytics?.least_correlated ?? []}
            loading={false}
          />
        </FadeIn>
      )}

      {/* Coin Description */}
      <CoinDescription description={coin.description} />

      {/* Add to Portfolio Dialog */}
      {user && coin && (
        <AddHoldingDialog
          open={portfolioDialogOpen}
          onOpenChange={setPortfolioDialogOpen}
          onAdd={addHolding}
          preselectedCoin={{
            id: coin.id,
            name: coin.name,
            symbol: coin.symbol,
            image_url: coin.image_url,
          }}
        />
      )}

      {/* Price Alert Dialog */}
      {user && coin && (
        <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Set Price Alert for {coin.symbol.toUpperCase()}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-slate-300">Alert when price goes</Label>
                <div className="flex gap-2">
                  <Button
                    variant={alertDirection === "above" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAlertDirection("above")}
                    className={alertDirection === "above" ? "bg-emerald-600 hover:bg-emerald-700" : "border-slate-700 text-slate-300"}
                  >
                    Above
                  </Button>
                  <Button
                    variant={alertDirection === "below" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAlertDirection("below")}
                    className={alertDirection === "below" ? "bg-red-600 hover:bg-red-700" : "border-slate-700 text-slate-300"}
                  >
                    Below
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Target Price (USD)</Label>
                <Input
                  type="number"
                  step="any"
                  value={alertPrice}
                  onChange={(e) => setAlertPrice(e.target.value)}
                  placeholder="e.g. 50000"
                  className="bg-slate-800 border-slate-700 text-white"
                />
                {coin.price_usd && (
                  <p className="text-xs text-slate-500">
                    Current price: ${coin.price_usd.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAlertDialogOpen(false)}
                className="border-slate-700 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                disabled={alertSaving}
                onClick={async () => {
                  const price = parseFloat(alertPrice);
                  if (isNaN(price) || price <= 0) return;
                  setAlertSaving(true);
                  try {
                    await createAlert(coin.id, price, alertDirection);
                    setAlertDialogOpen(false);
                  } catch { /* toast handled in hook */ }
                  finally { setAlertSaving(false); }
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {alertSaving ? "Setting..." : "Set Alert"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
