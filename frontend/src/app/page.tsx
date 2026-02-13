"use client";

import { useMarketOverview } from "@/hooks/use-market-data";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { TopMovers } from "@/components/dashboard/TopMovers";
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
            />
            <KpiCard
              title="24h Volume"
              value={formatCompact(data.total_volume_24h)}
              change={null}
              icon={<BarChart3 className="size-5" />}
              accentColor="emerald"
            />
            <KpiCard
              title="BTC Dominance"
              value={`${data.btc_dominance.toFixed(1)}%`}
              change={null}
              icon={<Bitcoin className="size-5" />}
              accentColor="amber"
            />
            <KpiCard
              title="Active Coins"
              value={new Intl.NumberFormat("en-US").format(data.active_coins)}
              change={null}
              icon={<Coins className="size-5" />}
              accentColor="cyan"
            />
          </>
        )}
      </div>

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
