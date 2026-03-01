"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import type { QualitySummary, QualityCheck } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/formatters";

function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference * (1 - score / 100);

  const getColor = (s: number) => {
    if (s >= 80) return "#34d399";
    if (s >= 60) return "#fbbf24";
    return "#f87171";
  };

  const color = getColor(score);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#334155"
          strokeWidth={4}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-sm font-bold text-white">{Math.round(score)}%</span>
    </div>
  );
}

function scoreLabel(score: number): { text: string; color: string } {
  if (score >= 90) return { text: "Excellent", color: "text-emerald-400" };
  if (score >= 70) return { text: "Good", color: "text-emerald-400" };
  if (score >= 50) return { text: "Warning", color: "text-yellow-400" };
  return { text: "Critical", color: "text-red-400" };
}

function SummaryCard({ summary }: { summary: QualitySummary }) {
  const label = scoreLabel(summary.score);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className="glass-card">
          <CardContent className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <ScoreRing score={summary.score} />
              <span className={cn("text-xs font-medium", label.color)}>{label.text}</span>
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold text-white">{summary.table_name}</p>
              <p className="text-xs text-slate-400">
                {summary.passed} / {summary.total_checks} checks passed
              </p>
              <div className="flex gap-3 text-xs">
                <span className="text-emerald-400">{summary.passed} passed</span>
                <span className="text-red-400">{summary.failed} failed</span>
                <span className="text-yellow-400">{summary.warnings} warnings</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        sideOffset={6}
        className="max-w-xs border border-slate-700/50 bg-slate-800/95 backdrop-blur-md text-slate-300 shadow-xl shadow-black/20"
      >
        Quality score = passed checks / total checks. Excellent (&ge;90%), Good (&ge;70%), Warning (&ge;50%), Critical (&lt;50%).
      </TooltipContent>
    </Tooltip>
  );
}

export default function QualityPage() {
  const [summaries, setSummaries] = useState<QualitySummary[] | null>(null);
  const [checks, setChecks] = useState<QualityCheck[] | null>(null);
  const [checksTotal, setChecksTotal] = useState(0);
  const [checksPages, setChecksPages] = useState(1);
  const [page, setPage] = useState(1);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [checksLoading, setChecksLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(false);
  const [checksError, setChecksError] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const perPage = 15;
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      setSummaryError(false);
      const result = await api.getQualitySummary();
      setSummaries(result);
    } catch {
      setSummaryError(true);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchChecks = useCallback(async () => {
    try {
      setChecksLoading(true);
      setChecksError(false);
      const result = await api.getQualityChecks(
        page,
        perPage,
        statusFilter === "all" ? undefined : statusFilter,
        tableFilter === "all" ? undefined : tableFilter,
      );
      setChecks(result.items);
      setChecksTotal(result.total);
      setChecksPages(result.pages);
    } catch {
      setChecksError(true);
    } finally {
      setChecksLoading(false);
    }
  }, [page, statusFilter, tableFilter]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchChecks();
  }, [fetchChecks]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    refreshRef.current = setInterval(() => {
      fetchSummary();
      fetchChecks();
    }, 60000);
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, [fetchSummary, fetchChecks]);

  // Get unique table names for filter dropdown
  const tableNames = summaries ? [...new Set(summaries.map((s) => s.table_name))] : [];

  return (
    <div className="space-y-6">
      {/* Page Intro */}
      <div>
        <h2 className="text-2xl font-bold text-white">Data Quality Monitoring</h2>
        <p className="mt-1 text-sm text-slate-400">
          Automated data quality checks run hourly via cron to ensure the integrity of the data warehouse.
          Checks include freshness validation (is data up-to-date?), completeness (are all coins present?), schema validation
          (no unexpected NULLs?), anomaly detection (unusual price spikes?), and referential integrity across fact and dimension tables.
        </p>
      </div>

      {/* Summary Cards */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Quality Summary</h2>
        <p className="text-xs text-slate-400 -mt-2 mb-4">
          Aggregate quality score per table. The score represents the percentage of checks that passed. Green (&ge;80%), yellow (&ge;60%), red (&lt;60%).
        </p>
        {summaryLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl bg-slate-700" />
            ))}
          </div>
        ) : summaryError ? (
          <ErrorState message="Failed to load quality summary." onRetry={fetchSummary} compact />
        ) : summaries && summaries.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {summaries.map((s) => (
              <SummaryCard key={s.table_name} summary={s} />
            ))}
          </div>
        ) : (
          <Card className="glass-card">
            <CardContent className="flex h-24 items-center justify-center text-slate-500">
              No quality summary data available
            </CardContent>
          </Card>
        )}
      </div>

      {/* Checks Table */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-white">Quality Checks</CardTitle>
              <p className="text-xs text-slate-400 mt-1">
                Individual check results with timestamps and details. Each row represents a single quality assertion.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[140px] bg-slate-800/50 border-slate-700 text-slate-300">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-slate-300">All Status</SelectItem>
                  <SelectItem value="passed" className="text-slate-300">Passed</SelectItem>
                  <SelectItem value="failed" className="text-slate-300">Failed</SelectItem>
                  <SelectItem value="warning" className="text-slate-300">Warning</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tableFilter} onValueChange={(v) => { setTableFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[180px] bg-slate-800/50 border-slate-700 text-slate-300">
                  <SelectValue placeholder="Table" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-slate-300">All Tables</SelectItem>
                  {tableNames.map((name) => (
                    <SelectItem key={name} value={name} className="text-slate-300">{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {checksLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full bg-slate-700" />
              ))}
            </div>
          ) : checksError ? (
            <div className="p-6">
              <ErrorState message="Failed to load quality checks." onRetry={fetchChecks} compact />
            </div>
          ) : checks && checks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent bg-slate-800/30">
                  <TableHead>Name</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Details</TableHead>
                  <TableHead className="hidden sm:table-cell">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checks.map((check) => (
                  <TableRow
                    key={check.id}
                    className="border-slate-800 hover:bg-slate-700/30 transition-colors duration-200"
                  >
                    <TableCell className="font-medium text-white">
                      {check.check_name}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {check.table_name}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={check.status} />
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm hidden md:table-cell max-w-xs truncate">
                      {check.details
                        ? JSON.stringify(check.details).slice(0, 100)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-slate-400 hidden sm:table-cell">
                      {formatDateTime(check.executed_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex h-32 items-center justify-center text-slate-500">
              No quality checks recorded
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {checksPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Showing {(page - 1) * perPage + 1}-
            {Math.min(page * perPage, checksTotal)} of {checksTotal} checks
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <span className="text-sm text-slate-400">
              Page {page} of {checksPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(checksPages, p + 1))}
              disabled={page >= checksPages}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40"
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
