"use client";

import { useMarketOverview, useCoins } from "@/hooks/use-market-data";
import { useLivePrices } from "@/hooks/use-live-prices";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { TopMovers } from "@/components/dashboard/TopMovers";
import { MarketTreemap } from "@/components/dashboard/MarketTreemap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  BarChart3,
  Bitcoin,
  Coins,
} from "lucide-react";

function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

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
  const { data, loading } = useMarketOverview();
  const { data: coinsData, loading: coinsLoading } = useCoins(1, 50);
  const { prices: livePrices } = useLivePrices();

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading || !data ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              title="Total Market Cap"
              value={formatCompact(data.total_market_cap)}
              change={null}
              icon={<DollarSign className="size-5" />}
              accentColor="indigo"
              tooltip="Combined value of all tracked cryptocurrencies — price × circulating supply, summed across the top 50 coins."
            />
            <KpiCard
              title="24h Volume"
              value={formatCompact(data.total_volume_24h)}
              change={null}
              icon={<BarChart3 className="size-5" />}
              accentColor="emerald"
              tooltip="Total trading volume across all tracked coins in the last 24 hours. High volume indicates strong market activity."
            />
            <KpiCard
              title="BTC Dominance"
              value={`${data.btc_dominance.toFixed(1)}%`}
              change={null}
              icon={<Bitcoin className="size-5" />}
              accentColor="amber"
              tooltip="Bitcoin's share of total crypto market cap. A drop often signals capital flowing into altcoins."
            />
            <KpiCard
              title="Active Coins"
              value={new Intl.NumberFormat("en-US").format(data.active_coins)}
              change={null}
              icon={<Coins className="size-5" />}
              accentColor="cyan"
              tooltip="Number of cryptocurrencies currently tracked in the CryptoFlow data pipeline."
            />
          </>
        )}
      </div>

      {/* Market Map */}
      <div>
        <h3 className="text-lg font-semibold text-white">Market Map</h3>
        <p className="mt-1 text-sm text-slate-400">
          All tracked coins sized by market cap and colored by 24h price change. Click any tile to view details.
        </p>
      </div>
      <Card className="glass-card">
        <CardContent>
          {coinsLoading || !coinsData ? (
            <div className="space-y-3">
              <Skeleton className="h-[400px] w-full rounded-lg bg-slate-700" />
              <div className="flex items-center justify-center gap-2">
                <Skeleton className="h-3 w-36 bg-slate-700" />
              </div>
            </div>
          ) : (
            <MarketTreemap
              coins={coinsData.items}
              livePrices={livePrices}
            />
          )}
        </CardContent>
      </Card>

      {/* Top Movers */}
      <div>
        <p className="text-sm text-slate-400 mb-4">
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
          <>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white">Top Gainers</CardTitle>
              </CardHeader>
              <CardContent>
                <TopMovers title="Top Gainers" movers={data.top_gainers} />
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-white">Top Losers</CardTitle>
              </CardHeader>
              <CardContent>
                <TopMovers title="Top Losers" movers={data.top_losers} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
