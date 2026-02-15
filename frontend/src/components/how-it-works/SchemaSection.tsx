"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowDown, Zap } from "lucide-react";

const typeBadgeClasses: Record<string, string> = {
  Dimension: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  Fact: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  Analytics: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  View: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
};

function TableCard({
  name,
  type,
  columns,
  description,
  className,
}: {
  name: string;
  type: string;
  columns: string[];
  description: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-700/40 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-4 shadow-lg shadow-black/20",
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-white font-mono">{name}</p>
        <Badge variant="outline" className={cn("text-[10px]", typeBadgeClasses[type])}>
          {type}
        </Badge>
      </div>
      <p className="text-xs text-slate-400 mb-3">{description}</p>
      <ul className="space-y-1">
        {columns.map((col) => (
          <li key={col} className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span className="text-slate-600">&#8226;</span>
            {col}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConnectorDown() {
  return (
    <div className="flex justify-center py-3">
      <div className="flex flex-col items-center">
        <div className="w-px h-4 bg-slate-600" />
        <ArrowDown className="size-3 text-slate-500" />
      </div>
    </div>
  );
}

export function SchemaSection() {
  return (
    <div className="space-y-2">
      {/* Dimensions row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TableCard
          name="dim_coin"
          type="Dimension"
          description="Slowly changing reference data for each cryptocurrency"
          columns={["coingecko_id", "symbol, name", "image_url", "market_cap_rank"]}
        />
        <TableCard
          name="dim_time"
          type="Dimension"
          description="Calendar attributes for efficient time-based filtering"
          columns={["date", "year, quarter, month", "day_of_week", "is_weekend"]}
        />
      </div>

      <ConnectorDown />

      {/* Central fact table */}
      <div className="flex justify-center">
        <TableCard
          name="fact_market_data"
          type="Fact"
          description="10-minute price snapshots, the core of the warehouse"
          columns={[
            "coin_id -> dim_coin",
            "timestamp",
            "price_usd, market_cap",
            "total_volume, price_change_24h",
          ]}
          className="w-full sm:w-2/3 lg:w-1/2 border-indigo-500/30"
        />
      </div>

      <ConnectorDown />

      {/* Derived tables row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TableCard
          name="fact_daily_ohlcv"
          type="Fact"
          description="Daily aggregates for candlestick charts"
          columns={["coin_id, date", "open, high", "low, close", "volume"]}
        />
        <TableCard
          name="analytics_correlation"
          type="Analytics"
          description="Pearson correlation between coin pairs"
          columns={["coin_a_id, coin_b_id", "period_days", "correlation", "computed_at"]}
        />
        <TableCard
          name="analytics_volatility"
          type="Analytics"
          description="Risk metrics per coin and period"
          columns={["coin_id, period_days", "volatility", "max_drawdown", "sharpe_ratio"]}
        />
      </div>

      {/* Materialized View callout */}
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
        <div className="rounded-lg bg-cyan-500/15 p-2 text-cyan-400">
          <Zap className="size-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white font-mono">mv_latest_market_data</p>
          <p className="text-xs text-slate-400 mt-1">
            A materialized view that pre-joins the latest price per coin with dimension data.
            Refreshed after every ingestion cycle, it enables sub-millisecond dashboard queries
            without scanning the full fact table.
          </p>
          <Badge variant="outline" className="mt-2 bg-cyan-500/15 text-cyan-400 border-cyan-500/20 text-[10px]">
            Refreshed every 10 min
          </Badge>
        </div>
      </div>
    </div>
  );
}
