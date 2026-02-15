"use client";

import { useState } from "react";
import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useLivePricesContext } from "@/providers/live-prices-provider";
import { usePortfolio } from "@/hooks/use-portfolio";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PortfolioSummaryCards } from "@/components/portfolio/PortfolioSummaryCards";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { AllocationChart } from "@/components/portfolio/AllocationChart";
import { PerformanceChart } from "@/components/portfolio/PerformanceChart";
import { AddHoldingDialog } from "@/components/portfolio/AddHoldingDialog";
import type { PortfolioHolding } from "@/types";

export default function PortfolioPage() {
  const { user } = useAuth();
  const { prices } = useLivePricesContext();
  const { holdings, summary, loading, addHolding, updateHolding, deleteHolding } = usePortfolio();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editHolding, setEditHolding] = useState<PortfolioHolding | null>(null);

  const handleEdit = (holding: PortfolioHolding) => {
    setEditHolding(holding);
    setDialogOpen(true);
  };

  const handleOpenAdd = () => {
    setEditHolding(null);
    setDialogOpen(true);
  };

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 bg-slate-800" />
          ))}
        </div>
        <Skeleton className="h-96 bg-slate-800" />
      </div>
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Portfolio Overview</h2>
        <Button onClick={handleOpenAdd} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="size-4 mr-1" />
          Add Holding
        </Button>
      </div>

      <PortfolioSummaryCards summary={summary} holdings={holdings} prices={prices} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass-card lg:col-span-2 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base">Holdings</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <HoldingsTable
              holdings={holdings}
              livePrices={prices}
              onEdit={handleEdit}
              onDelete={deleteHolding}
            />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base">Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <AllocationChart holdings={holdings} prices={prices} />
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base">Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <PerformanceChart hasHoldings={holdings.length > 0} />
        </CardContent>
      </Card>

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
