"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArchitectureDiagram } from "@/components/how-it-works/ArchitectureDiagram";
import { SchemaSection } from "@/components/how-it-works/SchemaSection";
import { TechStackGrid } from "@/components/how-it-works/TechStackGrid";
import {
  Download,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Radio,
  Server,
  Zap,
  MonitorSmartphone,
  Clock,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Link2,
  ArrowRight,
  ArrowDown,
  Calculator,
  Activity,
  Target,
} from "lucide-react";
import type { ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Color class lookup (static strings for Tailwind v4 compatibility) */
/* ------------------------------------------------------------------ */

const accentClasses = {
  indigo: {
    border: "border-l-indigo-500",
    iconBg: "bg-indigo-500/15",
    iconText: "text-indigo-400",
    badge: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  },
  emerald: {
    border: "border-l-emerald-500",
    iconBg: "bg-emerald-500/15",
    iconText: "text-emerald-400",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  },
  violet: {
    border: "border-l-violet-500",
    iconBg: "bg-violet-500/15",
    iconText: "text-violet-400",
    badge: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  },
  amber: {
    border: "border-l-amber-500",
    iconBg: "bg-amber-500/15",
    iconText: "text-amber-400",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  },
  cyan: {
    border: "border-l-cyan-500",
    iconBg: "bg-cyan-500/15",
    iconText: "text-cyan-400",
    badge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  },
};

type AccentColor = keyof typeof accentClasses;

/* ------------------------------------------------------------------ */
/*  Section heading helper                                            */
/* ------------------------------------------------------------------ */

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Batch pipeline job card                                           */
/* ------------------------------------------------------------------ */

function JobCard({
  icon,
  title,
  schedule,
  color,
  steps,
  outputs,
}: {
  icon: ReactNode;
  title: string;
  schedule: string;
  color: AccentColor;
  steps: string[];
  outputs: string[];
}) {
  const c = accentClasses[color];
  return (
    <Card className={cn("glass-card border-l-[3px]", c.border)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("rounded-lg p-2", c.iconBg, c.iconText)}>
              {icon}
            </div>
            <CardTitle className="text-white text-base">{title}</CardTitle>
          </div>
          <Badge variant="outline" className={cn("text-[10px]", c.badge)}>
            {schedule}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ol className="space-y-2">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-slate-400">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-slate-300">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {outputs.map((o) => (
            <Badge
              key={o}
              variant="outline"
              className="text-[10px] bg-slate-700/50 text-slate-300 border-slate-600/50 font-mono"
            >
              {o}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Real-time flow step                                               */
/* ------------------------------------------------------------------ */

function RealtimeFlowBox({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 p-3 text-center flex-1 min-w-0">
      <div className="flex justify-center mb-2">
        <div className="rounded-lg bg-emerald-500/15 p-2 text-emerald-400">
          {icon}
        </div>
      </div>
      <p className="text-xs font-semibold text-white">{title}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>
    </div>
  );
}

function RealtimeArrowRight() {
  return (
    <div className="hidden sm:flex items-center justify-center shrink-0 px-0.5">
      <div className="relative flex items-center">
        <div className="h-px w-5 bg-emerald-500/40" />
        <ArrowRight className="size-3 text-emerald-500/60" />
        <span
          className="absolute top-1/2 -translate-y-1/2 size-1 rounded-full bg-emerald-400"
          style={{ animation: "flow-dot 2s infinite ease-in-out" }}
        />
      </div>
    </div>
  );
}

function RealtimeArrowDown() {
  return (
    <div className="flex sm:hidden items-center justify-center py-1">
      <ArrowDown className="size-3 text-emerald-500/60" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Quality check card                                                */
/* ------------------------------------------------------------------ */

function QualityCheckCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700/40 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-4 shadow-lg shadow-black/20">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-amber-500/15 p-2 text-amber-400 shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-xs text-slate-400 mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Analytics metric card                                             */
/* ------------------------------------------------------------------ */

function AnalyticsCard({
  icon,
  title,
  description,
  color,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  color: AccentColor;
}) {
  const c = accentClasses[color];
  return (
    <div className={cn("rounded-xl border border-slate-700/40 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 shadow-lg shadow-black/20 border-l-[3px]", c.border)}>
      <div className="flex items-center gap-3 mb-3">
        <div className={cn("rounded-lg p-2", c.iconBg, c.iconText)}>
          {icon}
        </div>
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

/* ================================================================== */
/*  Main Page                                                         */
/* ================================================================== */

export default function HowItWorksPage() {
  return (
    <div className="space-y-10">
      {/* ============================================================ */}
      {/*  Section 1: Introduction                                     */}
      {/* ============================================================ */}
      <div>
        <h2 className="text-2xl font-bold text-white">How CryptoFlow Works</h2>
        <p className="mt-2 text-sm text-slate-400 max-w-3xl leading-relaxed">
          An end-to-end data pipeline that ingests, processes, and visualizes
          cryptocurrency market data, combining batch processing with real-time
          streaming. This page walks through the architecture layer by layer,
          from external data sources to the interactive dashboard.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge
            variant="outline"
            className="bg-indigo-500/15 text-indigo-400 border-indigo-500/20"
          >
            50 Coins Tracked
          </Badge>
          <Badge
            variant="outline"
            className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
          >
            6 Automated Quality Checks
          </Badge>
          <Badge
            variant="outline"
            className="bg-cyan-500/15 text-cyan-400 border-cyan-500/20"
          >
            Sub-ms Dashboard Queries
          </Badge>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Section 2: Architecture Overview                            */}
      {/* ============================================================ */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white">Architecture Overview</CardTitle>
          <p className="text-sm text-slate-400">
            Data flows from two external APIs through parallel batch and
            streaming pipelines into a PostgreSQL star schema, served by a
            FastAPI backend to a React frontend.
          </p>
        </CardHeader>
        <CardContent>
          <ArchitectureDiagram />
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/*  Section 3: Batch Pipeline                                   */}
      {/* ============================================================ */}
      <div className="space-y-4">
        <SectionHeading
          title="Batch Pipeline"
          description="Four cron-scheduled Python scripts handle all batch processing. Every run is tracked in the pipeline_runs table with status, duration, and record counts."
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <JobCard
            icon={<Download className="size-4" />}
            title="Market Data Ingestion"
            schedule="Every 10 min"
            color="indigo"
            steps={[
              "Fetch top 50 coins from CoinGecko REST API with retry logic and exponential backoff",
              "Upsert dimension data into dim_coin (name, symbol, rank, image)",
              "Insert price snapshot into fact_market_data (price, volume, market cap, 24h change)",
              "Refresh the mv_latest_market_data materialized view for instant dashboard queries",
            ]}
            outputs={["fact_market_data", "dim_coin", "mv_latest_market_data"]}
          />

          <JobCard
            icon={<BarChart3 className="size-4" />}
            title="OHLCV Aggregation"
            schedule="Daily 03:00"
            color="emerald"
            steps={[
              "Query all 10-minute snapshots from the rolling 90-day window",
              "Group by coin and date, compute Open (first), High (max), Low (min), Close (last)",
              "Sum trading volume per day",
              "Upsert results into fact_daily_ohlcv for candlestick charts",
            ]}
            outputs={["fact_daily_ohlcv", "dim_time"]}
          />

          <JobCard
            icon={<TrendingUp className="size-4" />}
            title="Analytics Computation"
            schedule="Daily 04:00"
            color="violet"
            steps={[
              "Compute daily returns from closing prices",
              "Calculate 15x15 Pearson correlation matrix across the top coins by market cap",
              "Derive volatility (std dev), max drawdown, and Sharpe ratio per coin",
              "Upsert into analytics_correlation and analytics_volatility for both 30-day and 90-day periods",
            ]}
            outputs={["analytics_correlation", "analytics_volatility"]}
          />

          <JobCard
            icon={<ShieldCheck className="size-4" />}
            title="Data Quality Checks"
            schedule="Hourly"
            color="amber"
            steps={[
              "Run 6 automated SQL-based checks against fact and dimension tables",
              "Evaluate each check as passed, warning, or failed",
              "Compute aggregate quality scores per table",
              "Store results in data_quality_checks for the Quality dashboard",
            ]}
            outputs={["data_quality_checks"]}
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Section 4: Real-Time Streaming                              */}
      {/* ============================================================ */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-white">Real-Time Price Streaming</CardTitle>
          <p className="text-sm text-slate-400">
            A parallel pipeline delivers live price updates with sub-second
            latency, completely independent of the batch process. Redis Pub/Sub
            decouples the consumer from the API server for independent scaling.
          </p>
        </CardHeader>
        <CardContent>
          {/* Desktop: horizontal flow */}
          <div className="hidden sm:flex sm:items-start sm:gap-0">
            <RealtimeFlowBox
              icon={<Zap className="size-4" />}
              title="CoinCap WebSocket"
              subtitle="Streaming feed for top 20 assets"
            />
            <RealtimeArrowRight />
            <RealtimeFlowBox
              icon={<Radio className="size-4" />}
              title="Python Consumer"
              subtitle="Async process with auto-reconnect"
            />
            <RealtimeArrowRight />
            <RealtimeFlowBox
              icon={<Server className="size-4" />}
              title="Redis Pub/Sub"
              subtitle="Channel: crypto:prices"
            />
            <RealtimeArrowRight />
            <RealtimeFlowBox
              icon={<Zap className="size-4" />}
              title="FastAPI WebSocket"
              subtitle="Broadcasts to all sessions"
            />
            <RealtimeArrowRight />
            <RealtimeFlowBox
              icon={<MonitorSmartphone className="size-4" />}
              title="React Hook"
              subtitle="useLivePrices() with flash animations"
            />
          </div>

          {/* Mobile: vertical flow */}
          <div className="sm:hidden space-y-0">
            <RealtimeFlowBox
              icon={<Zap className="size-4" />}
              title="CoinCap WebSocket"
              subtitle="Streaming feed for top 20 assets"
            />
            <RealtimeArrowDown />
            <RealtimeFlowBox
              icon={<Radio className="size-4" />}
              title="Python Consumer"
              subtitle="Async process with auto-reconnect"
            />
            <RealtimeArrowDown />
            <RealtimeFlowBox
              icon={<Server className="size-4" />}
              title="Redis Pub/Sub"
              subtitle="Channel: crypto:prices"
            />
            <RealtimeArrowDown />
            <RealtimeFlowBox
              icon={<Zap className="size-4" />}
              title="FastAPI WebSocket"
              subtitle="Broadcasts to all sessions"
            />
            <RealtimeArrowDown />
            <RealtimeFlowBox
              icon={<MonitorSmartphone className="size-4" />}
              title="React Hook"
              subtitle="useLivePrices() with flash animations"
            />
          </div>
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/*  Section 5: Star Schema                                      */}
      {/* ============================================================ */}
      <div className="space-y-4">
        <SectionHeading
          title="Star Schema Data Warehouse"
          description="The PostgreSQL database uses dimensional modeling, the same approach used in production data warehouses. Dimensions provide context, facts store measurements, and a materialized view caches expensive joins."
        />
        <SchemaSection />
      </div>

      {/* ============================================================ */}
      {/*  Section 6: Analytics Engine                                 */}
      {/* ============================================================ */}
      <div className="space-y-4">
        <SectionHeading
          title="Precomputed Analytics"
          description="Heavy computations run in daily batch jobs rather than on-demand, enabling instant chart rendering on the frontend."
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <AnalyticsCard
            icon={<Calculator className="size-4" />}
            title="Correlation Matrix"
            description="Pearson correlation of daily returns between the top 15 coins. Values range from -1 (inverse movement) to +1 (identical movement). A minimum of 5 overlapping data points is required."
            color="violet"
          />
          <AnalyticsCard
            icon={<Activity className="size-4" />}
            title="Volatility"
            description="Standard deviation of daily returns over 30 or 90 days. Higher values indicate more price fluctuation and higher risk."
            color="amber"
          />
          <AnalyticsCard
            icon={<Target className="size-4" />}
            title="Risk Metrics"
            description="Sharpe ratio measures risk-adjusted return (annualized return divided by annualized volatility). Max drawdown captures the worst peak-to-trough decline during the period."
            color="indigo"
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Section 7: Data Quality                                     */}
      {/* ============================================================ */}
      <div className="space-y-4">
        <SectionHeading
          title="Automated Quality Monitoring"
          description="Six SQL-based checks run every hour to catch pipeline issues before they reach users. Each check returns a pass, warning, or fail status."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <QualityCheckCard
            icon={<Clock className="size-4" />}
            title="Freshness"
            description="Is the latest data less than 30 minutes old? Warning threshold at 60 minutes."
          />
          <QualityCheckCard
            icon={<CheckCircle className="size-4" />}
            title="Completeness"
            description="Are all 50 tracked coins present in the last snapshot? Passes above 90% coverage."
          />
          <QualityCheckCard
            icon={<AlertCircle className="size-4" />}
            title="Null Validation"
            description="Are there any unexpected NULL prices in recent data? Zero tolerance for production."
          />
          <QualityCheckCard
            icon={<AlertTriangle className="size-4" />}
            title="Anomaly Detection"
            description="Did any coin's price change more than 50% between consecutive snapshots?"
          />
          <QualityCheckCard
            icon={<Link2 className="size-4" />}
            title="Referential Integrity"
            description="Do all fact_market_data rows reference valid dim_coin records?"
          />
          <QualityCheckCard
            icon={<BarChart3 className="size-4" />}
            title="OHLCV Consistency"
            description="Is High >= Low? Is Close within the expected High/Low range? Checks the last 7 days."
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Section 8: Tech Stack                                       */}
      {/* ============================================================ */}
      <div className="space-y-4">
        <SectionHeading
          title="Tech Stack"
          description="The technologies powering each layer of the CryptoFlow platform."
        />
        <TechStackGrid />
      </div>
    </div>
  );
}
