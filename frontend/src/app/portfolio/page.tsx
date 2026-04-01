"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Briefcase, Download, Plus, Loader2, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useLivePricesContext } from "@/providers/live-prices-provider";
import { usePortfolio } from "@/hooks/use-portfolio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { FadeIn } from "@/components/ui/fade-in";
import { ChartErrorBoundary } from "@/components/ui/chart-error-boundary";
import { PortfolioSummaryCards } from "@/components/portfolio/PortfolioSummaryCards";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import type { HoldingSortField, HoldingSortDirection } from "@/components/portfolio/HoldingsTable";
import { AllocationChart } from "@/components/portfolio/AllocationChart";
import { PerformanceChart } from "@/components/portfolio/PerformanceChart";
import { AttributionChart } from "@/components/portfolio/AttributionChart";
import { AddHoldingDialog } from "@/components/portfolio/AddHoldingDialog";
import type { PortfolioHolding, PortfolioAttribution } from "@/types";

export default function PortfolioPage() {
  const { user } = useAuth();
  const { prices } = useLivePricesContext();
  const { holdings, summary, loading, error, addHolding, updateHolding, deleteHolding, refetch } = usePortfolio();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editHolding, setEditHolding] = useState<PortfolioHolding | null>(null);
  const [csvExporting, setCsvExporting] = useState(false);
  const [attribution, setAttribution] = useState<PortfolioAttribution | null>(null);
  const [attributionLoading, setAttributionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<HoldingSortField>("current_value");
  const [sortDirection, setSortDirection] = useState<HoldingSortDirection>("desc");
  const [insights, setInsights] = useState<string | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState(false);

  const fetchAttribution = useCallback(async () => {
    setAttributionLoading(true);
    try {
      const data = await api.getPortfolioAttribution();
      setAttribution(data);
    } catch {
      setAttribution(null);
    } finally {
      setAttributionLoading(false);
    }
  }, []);

  const fetchInsights = useCallback(async () => {
    setInsightsLoading(true);
    setInsightsError(false);
    try {
      const data = await api.getPortfolioInsights();
      setInsights(data.insights);
    } catch {
      setInsightsError(true);
      setInsights(null);
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && holdings.length > 0) {
      fetchAttribution();
    }
  }, [user, holdings.length, fetchAttribution]);

  const handleEdit = (holding: PortfolioHolding) => {
    setEditHolding(holding);
    setDialogOpen(true);
  };

  const handleOpenAdd = () => {
    setEditHolding(null);
    setDialogOpen(true);
  };

  const handleSortChange = useCallback((field: HoldingSortField, direction: HoldingSortDirection) => {
    setSortField(field);
    setSortDirection(direction);
  }, []);

  const filteredAndSortedHoldings = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    const filtered = query
      ? holdings.filter(
          (h) =>
            h.name.toLowerCase().includes(query) ||
            h.symbol.toLowerCase().includes(query)
        )
      : holdings;

    return [...filtered].sort((a, b) => {
      let aVal: number | null;
      let bVal: number | null;

      const aLive = prices[a.coingecko_id];
      const bLive = prices[b.coingecko_id];
      const aPrice = aLive ?? a.current_price_usd;
      const bPrice = bLive ?? b.current_price_usd;

      switch (sortField) {
        case "current_value":
          aVal = aPrice != null ? a.quantity * aPrice : null;
          bVal = bPrice != null ? b.quantity * bPrice : null;
          break;
        case "pnl": {
          const aValue = aPrice != null ? a.quantity * aPrice : null;
          const bValue = bPrice != null ? b.quantity * bPrice : null;
          aVal = aValue != null ? aValue - a.cost_basis_usd : null;
          bVal = bValue != null ? bValue - b.cost_basis_usd : null;
          break;
        }
        case "pnl_pct": {
          const aValue2 = aPrice != null ? a.quantity * aPrice : null;
          const bValue2 = bPrice != null ? b.quantity * bPrice : null;
          const aPnl = aValue2 != null ? aValue2 - a.cost_basis_usd : null;
          const bPnl = bValue2 != null ? bValue2 - b.cost_basis_usd : null;
          aVal = aPnl != null && a.cost_basis_usd > 0 ? (aPnl / a.cost_basis_usd) * 100 : null;
          bVal = bPnl != null && b.cost_basis_usd > 0 ? (bPnl / b.cost_basis_usd) * 100 : null;
          break;
        }
        case "quantity":
          aVal = a.quantity;
          bVal = b.quantity;
          break;
        default:
          return 0;
      }

      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [holdings, prices, searchQuery, sortField, sortDirection]);

  // State 1: Not logged in
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-indigo-500/15">
          <Briefcase className="size-10 text-indigo-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Track Your Portfolio</h2>
          <p className="text-slate-400 max-w-md">
            Sign in to track your crypto holdings, see real-time P&L, and analyze your portfolio allocation.
          </p>
        </div>
        <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Link href="/auth/login">Sign In</Link>
        </Button>
      </div>
    );
  }

  // Loading state
  if (loading && holdings.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 bg-slate-700" />
          ))}
        </div>
        <Skeleton className="h-96 bg-slate-700" />
      </div>
    );
  }

  // Error state
  if (error && holdings.length === 0) {
    return (
      <ErrorState message="Failed to load portfolio data." onRetry={refetch} />
    );
  }

  // State 2: No holdings
  if (holdings.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-indigo-500/15">
          <Briefcase className="size-10 text-indigo-400" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Start Tracking Your Portfolio</h2>
          <p className="text-slate-400 max-w-md">
            Add your first holding to track portfolio value, see P&L, and view allocation charts.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="size-4 mr-2" />
          Add First Holding
        </Button>
        <AddHoldingDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onAdd={addHolding}
        />
      </div>
    );
  }

  // State 3: Has holdings
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Portfolio</h2>
          <div className="flex gap-2">
            <Button
              onClick={async () => {
                if (csvExporting) return;
                setCsvExporting(true);
                try {
                  const blob = await api.exportPortfolioCsv();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  const today = new Date().toLocaleDateString('en-CA');
                  a.download = `cryptoflow-portfolio-${today}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("Portfolio exported");
                } catch (err) {
                  toast.error((err as Error).message || "Failed to export portfolio");
                } finally {
                  setCsvExporting(false);
                }
              }}
              size="sm"
              variant="outline"
              disabled={csvExporting}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              {csvExporting ? (
                <Loader2 className="size-4 mr-1 animate-spin" />
              ) : (
                <Download className="size-4 mr-1" />
              )}
              {csvExporting ? "Exporting..." : "Export CSV"}
            </Button>
            <Button onClick={handleOpenAdd} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="size-4 mr-1" />
              Add Holding
            </Button>
          </div>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Track your crypto holdings, monitor real-time P&L, and analyze your portfolio allocation.
        </p>
      </div>

      <PortfolioSummaryCards summary={summary} holdings={holdings} prices={prices} />

      <Card className="glass-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-white text-base">AI Insights</CardTitle>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs font-medium text-indigo-400">
                <Sparkles className="size-3" />
                AI
              </span>
            </div>
            <Button
              onClick={fetchInsights}
              size="sm"
              variant="outline"
              disabled={insightsLoading}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              {insightsLoading ? (
                <Loader2 className="size-4 mr-1 animate-spin" />
              ) : (
                <Sparkles className="size-4 mr-1" />
              )}
              {insightsLoading ? "Analyzing..." : insights ? "Refresh Insights" : "Generate Insights"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!insights && !insightsLoading && !insightsError && (
            <p className="text-sm text-slate-400">
              Click &ldquo;Generate Insights&rdquo; to get an AI-powered analysis of your portfolio.
            </p>
          )}
          {insightsError && !insightsLoading && (
            <p className="text-sm text-red-400">
              Failed to generate insights. Please try again.
            </p>
          )}
          {insightsLoading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full bg-slate-700" />
              <Skeleton className="h-4 w-5/6 bg-slate-700" />
              <Skeleton className="h-4 w-4/6 bg-slate-700" />
              <Skeleton className="h-4 w-full bg-slate-700" />
            </div>
          )}
          {insights && !insightsLoading && (
            <FadeIn>
              <div className="prose prose-sm prose-invert max-w-none text-slate-300 [&>ul]:space-y-1 [&>ul]:list-disc [&>ul]:pl-4 [&_strong]:text-white [&_li]:text-slate-300">
                {insights.split("\n").map((line, i) => {
                  if (!line.trim()) return null;
                  // Render markdown-style bold
                  const parts = line.replace(/^- /, "").split(/(\*\*[^*]+\*\*)/g);
                  return (
                    <div key={i} className="flex gap-1.5 text-sm leading-relaxed">
                      {line.trim().startsWith("-") && <span className="text-indigo-400 mt-0.5 shrink-0">&#x2022;</span>}
                      <span>
                        {parts.map((part, j) =>
                          part.startsWith("**") && part.endsWith("**") ? (
                            <strong key={j} className="text-white font-medium">
                              {part.slice(2, -2)}
                            </strong>
                          ) : (
                            <span key={j}>{part}</span>
                          )
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </FadeIn>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass-card lg:col-span-2 overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-white text-base">Holdings</CardTitle>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Search by name or symbol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-8 bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-400 text-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredAndSortedHoldings.length === 0 && searchQuery ? (
              <div className="py-8 text-center text-sm text-slate-400">
                No holdings match &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              <HoldingsTable
                holdings={filteredAndSortedHoldings}
                livePrices={prices}
                onEdit={handleEdit}
                onDelete={deleteHolding}
                sortField={sortField}
                sortDirection={sortDirection}
                onSortChange={handleSortChange}
              />
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base">Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartErrorBoundary compact>
              <AllocationChart holdings={holdings} prices={prices} />
            </ChartErrorBoundary>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base">Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartErrorBoundary>
            <PerformanceChart hasHoldings={holdings.length > 0} />
          </ChartErrorBoundary>
        </CardContent>
      </Card>

      {attributionLoading && (
        <Skeleton className="h-96 bg-slate-700" />
      )}

      {attribution && attribution.holdings.length > 0 && !attributionLoading && (
        <FadeIn>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base">Performance Attribution</CardTitle>
            </CardHeader>
            <CardContent>
              <AttributionChart attribution={attribution} />
            </CardContent>
          </Card>
        </FadeIn>
      )}

      <AddHoldingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdd={addHolding}
        onEdit={updateHolding}
        editHolding={editHolding}
      />
    </div>
  );
}
