"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { QualitySummary, QualityCheck } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: string }) {
  const statusLower = status.toLowerCase();
  const colorClass =
    statusLower === "passed"
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
      : statusLower === "failed"
        ? "bg-red-500/15 text-red-400 border-red-500/20"
        : statusLower === "warning"
          ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/20"
          : "bg-slate-500/15 text-slate-400 border-slate-500/20";

  return (
    <Badge variant="outline" className={cn("capitalize", colorClass)}>
      {status}
    </Badge>
  );
}

function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference * (1 - score / 100);

  const getColor = (s: number) => {
    if (s >= 80) return "#34d399";
    if (s >= 60) return "#fbbf24";
    return "#f87171";
  };

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
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
          stroke={getColor(score)}
          strokeWidth={4}
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-sm font-bold text-white">{Math.round(score)}%</span>
    </div>
  );
}

function SummaryCard({ summary }: { summary: QualitySummary }) {
  return (
    <Card className="bg-slate-800/50 border-slate-700/50">
      <CardContent className="flex items-center gap-4">
        <ScoreRing score={summary.score} />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold text-white">{summary.table_name}</p>
          <p className="text-xs text-slate-400">
            {summary.total_checks} checks total
          </p>
          <div className="flex gap-3 text-xs">
            <span className="text-emerald-400">{summary.passed} passed</span>
            <span className="text-red-400">{summary.failed} failed</span>
            <span className="text-yellow-400">{summary.warnings} warnings</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function QualityPage() {
  const [summaries, setSummaries] = useState<QualitySummary[] | null>(null);
  const [checks, setChecks] = useState<QualityCheck[] | null>(null);
  const [checksTotal, setChecksTotal] = useState(0);
  const [checksPages, setChecksPages] = useState(1);
  const [page, setPage] = useState(1);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [checksLoading, setChecksLoading] = useState(true);
  const perPage = 15;

  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const result = await api.getQualitySummary();
      setSummaries(result);
    } catch {
      // handle error silently
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchChecks = useCallback(async () => {
    try {
      setChecksLoading(true);
      const result = await api.getQualityChecks(page, perPage);
      setChecks(result.items);
      setChecksTotal(result.total);
      setChecksPages(result.pages);
    } catch {
      // handle error silently
    } finally {
      setChecksLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchChecks();
  }, [fetchChecks]);

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
        ) : summaries && summaries.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {summaries.map((s) => (
              <SummaryCard key={s.table_name} summary={s} />
            ))}
          </div>
        ) : (
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="flex h-24 items-center justify-center text-slate-500">
              No quality summary data available
            </CardContent>
          </Card>
        )}
      </div>

      {/* Checks Table */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">Quality Checks</CardTitle>
          <p className="text-xs text-slate-400">
            Individual check results with timestamps and details. Each row represents a single quality assertion — passed, warning, or failed.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {checksLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full bg-slate-700" />
              ))}
            </div>
          ) : checks && checks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
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
                    className="border-slate-800 hover:bg-slate-800/50"
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
