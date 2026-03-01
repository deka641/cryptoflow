"use client";

import { useMarketOverview, useCoins, useKpiSparklines } from "@/hooks/use-market-data";
import { useLivePricesContext } from "@/providers/live-prices-provider";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { TopMovers } from "@/components/dashboard/TopMovers";
import { KpiSparkline } from "@/components/dashboard/KpiSparkline";
import { MarketTreemap } from "@/components/dashboard/MarketTreemap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { FadeIn } from "@/components/ui/fade-in";
import {
  DollarSign,
  BarChart3,
  Bitcoin,
  Coins,
} from "lucide-react";
import { formatCompactCurrency } from "@/lib/formatters";
import { useCountUp } from "@/hooks/use-count-up";

function KpiSkeleton() {
  return (
    <Card className="glass-card">
      <CardContent className="flex items-start justify-between">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24 bg-slate-700" />
          <Skeleton className="h-8 w-32 bg-slate-700" />
          <Skeleton className="h-4 w-16 bg-slate-700" />
        </div>
        <Skeleton className="size-10 rounded-lg bg-slate-700" />
      </CardContent>
    </Card>
  );
}

function MoversSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-28 bg-slate-700" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg bg-slate-700" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, loading, error, refetch } = useMarketOverview();
  const { data: coinsData, loading: coinsLoading, error: coinsError, refetch: refetchCoins } = useCoins(1, 50);
  const { prices: livePrices } = useLivePricesContext();
  const sparklines = useKpiSparklines();

  const animatedMarketCap = useCountUp(data?.total_market_cap ?? null);
  const animatedVolume = useCountUp(data?.total_volume_24h ?? null);
  const animatedDominance = useCountUp(data?.btc_dominance ?? null);
  const animatedCoins = useCountUp(data?.active_coins ?? null);

  return (
    <div className="space-y-6">
      {/* Page Intro */}
      <div>
        <h2 className="text-2xl font-bold text-white">Market Overview</h2>
        <p className="mt-1 text-sm text-slate-400">
          Real-time snapshot of the cryptocurrency market. Key performance indicators are derived from
          live market data ingested every 10 minutes via scheduled batch jobs, covering the top 50 coins by market capitalization.
        </p>
      </div>

      {/* KPI Cards */}
      {error && !data ? (
        <ErrorState message="Failed to load market data" onRetry={refetch} />
      ) : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading || !data ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <FadeIn className="contents">
            <KpiCard
              title="Total Market Cap"
              value={formatCompactCurrency(animatedMarketCap ?? data.total_market_cap)}
              change={data.market_cap_change_24h_pct ?? null}
              icon={<DollarSign className="size-5" />}
              accentColor="indigo"
              tooltip="Combined value of all tracked cryptocurrencies — price × circulating supply, summed across the top 50 coins."
              sparkline={sparklines?.market_cap && sparklines.market_cap.length > 1 ? (
                <KpiSparkline data={sparklines.market_cap} positive={(data.market_cap_change_24h_pct ?? 0) >= 0} />
              ) : undefined}
            />
            <KpiCard
              title="24h Volume"
              value={formatCompactCurrency(animatedVolume ?? data.total_volume_24h)}
              change={data.volume_change_24h_pct ?? null}
              icon={<BarChart3 className="size-5" />}
              accentColor="emerald"
              tooltip="Total trading volume across all tracked coins in the last 24 hours. High volume indicates strong market activity."
              sparkline={sparklines?.volume && sparklines.volume.length > 1 ? (
                <KpiSparkline data={sparklines.volume} positive={(data.volume_change_24h_pct ?? 0) >= 0} />
              ) : undefined}
            />
            <KpiCard
              title="BTC Dominance"
              value={`${(animatedDominance ?? data.btc_dominance).toFixed(1)}%`}
              change={null}
              icon={<Bitcoin className="size-5" />}
              accentColor="amber"
              tooltip="Bitcoin's share of total crypto market cap. A drop often signals capital flowing into altcoins."
              sparkline={sparklines?.btc_dominance && sparklines.btc_dominance.length > 1 ? (
                <KpiSparkline
                  data={sparklines.btc_dominance}
                  positive={sparklines.btc_dominance[sparklines.btc_dominance.length - 1] >= sparklines.btc_dominance[0]}
                />
              ) : undefined}
            />
            <KpiCard
              title="Active Coins"
              value={new Intl.NumberFormat("en-US").format(Math.round(animatedCoins ?? data.active_coins))}
              change={null}
              icon={<Coins className="size-5" />}
              accentColor="cyan"
              tooltip="Number of cryptocurrencies currently tracked in the CryptoFlow data pipeline."
            />
          </FadeIn>
        )}
      </div>
      )}

      {/* Market Map */}
      <div>
        <h3 className="text-lg font-semibold text-white">Market Map</h3>
        <p className="mt-1 text-sm text-slate-400">
          All tracked coins sized by market cap and colored by 24h price change. Click any tile to view details.
        </p>
      </div>
      <Card className="glass-card">
        <CardContent>
          {coinsError && !coinsData ? (
            <ErrorState message="Failed to load coin data" onRetry={refetchCoins} />
          ) : coinsLoading || !coinsData ? (
            <div className="space-y-3">
              <Skeleton className="h-[400px] w-full rounded-lg bg-slate-700" />
              <div className="flex items-center justify-center gap-2">
                <Skeleton className="h-3 w-36 bg-slate-700" />
              </div>
            </div>
          ) : (
            <FadeIn>
              <MarketTreemap
                coins={coinsData.items}
                livePrices={livePrices}
              />
            </FadeIn>
          )}
        </CardContent>
      </Card>

      {/* Top Movers */}
      <div>
        <h3 className="text-lg font-semibold text-white">Top Movers</h3>
        <p className="mt-1 text-sm text-slate-400 mb-4">
          Biggest price movements in the last 24 hours. Gainers and losers are ranked by their percentage price change, helping identify momentum shifts across the market.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {loading || !data ? (
          <>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white">Top Gainers</CardTitle>
              </CardHeader>
              <CardContent>
                <MoversSkeleton />
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white">Top Losers</CardTitle>
              </CardHeader>
              <CardContent>
                <MoversSkeleton />
              </CardContent>
            </Card>
          </>
        ) : (
          <FadeIn className="contents">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white">Top Gainers</CardTitle>
              </CardHeader>
              <CardContent>
                <TopMovers movers={data.top_gainers} />
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white">Top Losers</CardTitle>
              </CardHeader>
              <CardContent>
                <TopMovers movers={data.top_losers} />
              </CardContent>
            </Card>
          </FadeIn>
        )}
      </div>
    </div>
  );
}
