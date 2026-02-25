"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercentage } from "@/lib/formatters";

export interface CoinMetrics {
  coinId: number;
  symbol: string;
  name: string;
  imageUrl: string | null;
  color: string;
  currentPrice: number | null;
  totalReturnPct: number | null;
  annualizedVolatility: number | null;
  maxDrawdown: number | null;
  sharpeRatio: number | null;
}

interface PerformanceTableProps {
  metrics: CoinMetrics[];
}


export function PerformanceTable({ metrics }: PerformanceTableProps) {
  if (!metrics.length) return null;

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-slate-700 hover:bg-transparent bg-slate-800/30">
          <TableHead className="text-slate-400">Coin</TableHead>
          <TableHead className="text-right text-slate-400">Price</TableHead>
          <TableHead className="text-right text-slate-400">Return</TableHead>
          <TableHead className="text-right text-slate-400 hidden md:table-cell">
            Volatility
          </TableHead>
          <TableHead className="text-right text-slate-400 hidden md:table-cell">
            Max Drawdown
          </TableHead>
          <TableHead className="text-right text-slate-400 hidden lg:table-cell">
            Sharpe
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {metrics.map((m) => (
          <TableRow
            key={m.coinId}
            className="border-slate-800 hover:bg-slate-700/30 transition-colors duration-200"
          >
            <TableCell>
              <div className="flex items-center gap-2.5">
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: m.color }}
                />
                {m.imageUrl ? (
                  <img
                    src={m.imageUrl}
                    alt={m.name}
                    className="size-6 rounded-full shrink-0"
                  />
                ) : (
                  <div className="flex size-6 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-300 shrink-0">
                    {m.symbol[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <span className="font-medium text-white">{m.name}</span>
                  <span className="ml-1.5 text-xs text-slate-500 uppercase">
                    {m.symbol}
                  </span>
                </div>
              </div>
            </TableCell>
            <TableCell className="text-right font-medium text-white">
              {formatCurrency(m.currentPrice)}
            </TableCell>
            <TableCell
              className={cn(
                "text-right font-medium",
                m.totalReturnPct !== null && m.totalReturnPct >= 0
                  ? "text-emerald-400"
                  : "text-red-400"
              )}
            >
              {formatPercentage(m.totalReturnPct)}
            </TableCell>
            <TableCell className="text-right text-slate-300 hidden md:table-cell">
              {m.annualizedVolatility !== null ? `${m.annualizedVolatility.toFixed(2)}%` : "-"}
            </TableCell>
            <TableCell className="text-right text-red-400 hidden md:table-cell">
              {formatPercentage(m.maxDrawdown)}
            </TableCell>
            <TableCell className="text-right text-slate-300 hidden lg:table-cell">
              {m.sharpeRatio !== null ? m.sharpeRatio.toFixed(2) : "-"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
