"use client";

import { useMemo } from "react";
import { DollarSign, TrendingUp, TrendingDown, Percent, Coins } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PortfolioHolding, PortfolioSummary } from "@/types";

interface PortfolioSummaryCardsProps {
  summary: PortfolioSummary | null;
  holdings: PortfolioHolding[];
  prices: Record<string, number>;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    notation: value >= 1_000_000 ? "compact" : "standard",
  }).format(value);
}

export function PortfolioSummaryCards({ summary, holdings, prices }: PortfolioSummaryCardsProps) {
  const liveTotal = useMemo(() => {
    let total = 0;
    for (const h of holdings) {
      const price = prices[h.coingecko_id] ?? h.current_price_usd;
      if (price != null) total += h.quantity * price;
    }
    return total;
  }, [holdings, prices]);

  const displayValue = holdings.length > 0 ? liveTotal : (summary?.total_value_usd ?? 0);
  const costBasis = summary?.total_cost_basis_usd ?? 0;
  const pnlUsd = holdings.length > 0 ? displayValue - costBasis : (summary?.total_pnl_usd ?? 0);
  const pnlPct = costBasis > 0 ? (pnlUsd / costBasis) * 100 : null;
  const isPositive = pnlUsd >= 0;

  const cards = [
    {
      title: "Total Value",
      value: formatUsd(displayValue),
      icon: <DollarSign className="size-5" />,
      accent: "indigo" as const,
    },
    {
      title: "Total P&L",
      value: `${isPositive ? "+" : ""}${formatUsd(pnlUsd)}`,
      icon: isPositive ? <TrendingUp className="size-5" /> : <TrendingDown className="size-5" />,
      accent: (isPositive ? "emerald" : "red") as "emerald" | "red",
    },
    {
      title: "P&L %",
      value: pnlPct !== null ? `${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%` : "-",
      icon: <Percent className="size-5" />,
      accent: "amber" as const,
    },
    {
      title: "Holdings",
      value: `${summary?.holdings_count ?? 0} lots / ${summary?.unique_coins ?? 0} coins`,
      icon: <Coins className="size-5" />,
      accent: "cyan" as const,
    },
  ];

  const accentStyles: Record<string, { border: string; iconBg: string }> = {
    indigo: { border: "border-l-indigo-500", iconBg: "bg-indigo-500/15 text-indigo-400" },
    emerald: { border: "border-l-emerald-500", iconBg: "bg-emerald-500/15 text-emerald-400" },
    red: { border: "border-l-red-500", iconBg: "bg-red-500/15 text-red-400" },
    amber: { border: "border-l-amber-500", iconBg: "bg-amber-500/15 text-amber-400" },
    cyan: { border: "border-l-cyan-500", iconBg: "bg-cyan-500/15 text-cyan-400" },
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const a = accentStyles[card.accent];
        return (
          <Card key={card.title} className={cn("glass-card border-l-[3px]", a.border)}>
            <CardContent className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-400">{card.title}</p>
                <p className="text-2xl font-bold text-white">{card.value}</p>
              </div>
              <div className={cn("flex size-10 items-center justify-center rounded-lg", a.iconBg)}>
                {card.icon}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
