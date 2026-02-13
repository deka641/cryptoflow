"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { PipelineHealth, PipelineRun } from "@/types";
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
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const statusLower = status.toLowerCase();
  const colorClass =
    statusLower === "success"
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
      : statusLower === "failed"
        ? "bg-red-500/15 text-red-400 border-red-500/20"
        : statusLower === "running"
          ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/20"
          : "bg-slate-500/15 text-slate-400 border-slate-500/20";

  return (
    <Badge variant="outline" className={cn("capitalize", colorClass)}>
      {status}
    </Badge>
  );
}

function HealthCard({ health }: { health: PipelineHealth }) {
  return (
    <Card className="bg-slate-800/50 border-slate-700/50">
      <CardContent className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-400">Job</p>
          <p className="text-base font-semibold text-white">{health.dag_id}</p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="size-3" />
            {health.last_run_time
              ? formatDateTime(health.last_run_time)
              : "Never run"}
          </div>
          {health.data_freshness_minutes !== null && (
            <p className="text-xs text-slate-500">
              Data freshness: {health.data_freshness_minutes} min
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={cn(
              "inline-flex size-3 rounded-full",
              health.is_healthy ? "bg-emerald-500" : "bg-red-500"
            )}
          />
          {health.last_run_status && (
            <StatusBadge status={health.last_run_status} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PipelinePage() {
  const [health, setHealth] = useState<PipelineHealth[] | null>(null);
  const [runs, setRuns] = useState<PipelineRun[] | null>(null);
  const [runsTotal, setRunsTotal] = useState(0);
  const [runsPages, setRunsPages] = useState(1);
  const [page, setPage] = useState(1);
  const [healthLoading, setHealthLoading] = useState(true);
  const [runsLoading, setRunsLoading] = useState(true);
  const perPage = 15;

  const fetchHealth = useCallback(async () => {
    try {
      setHealthLoading(true);
      const result = await api.getPipelineHealth();
      setHealth(result);
    } catch {
      // handle error silently
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const fetchRuns = useCallback(async () => {
    try {
      setRunsLoading(true);
      const result = await api.getPipelineRuns(page, perPage);
      setRuns(result.items);
      setRunsTotal(result.total);
      setRunsPages(result.pages);
    } catch {
      // handle error silently
    } finally {
      setRunsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  return (
    <div className="space-y-6">
      {/* Page Intro */}
      <div>
        <h2 className="text-2xl font-bold text-white">Data Pipeline Monitor</h2>
        <p className="mt-1 text-sm text-slate-400">
          Operational dashboard for the scheduled batch jobs that power CryptoFlow&apos;s data infrastructure.
          Four cron-scheduled Python scripts handle market data ingestion (every 10 min), OHLCV aggregation (daily),
          analytics computation (daily), and data quality checks (hourly). Each card shows the job&apos;s current health status and data freshness.
        </p>
      </div>

      {/* Health Cards */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Pipeline Health</h2>
        {healthLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl bg-slate-700" />
            ))}
          </div>
        ) : health && health.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {health.map((h) => (
              <HealthCard key={h.dag_id} health={h} />
            ))}
          </div>
        ) : (
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardContent className="flex h-32 items-center justify-center text-slate-500">
              No pipeline health data available
            </CardContent>
          </Card>
        )}
      </div>

      {/* Runs Table */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">Pipeline Runs</CardTitle>
          <p className="text-xs text-slate-400">
            Execution history of all pipeline runs, including start/end times, records processed, and any error messages.
            Failed runs typically indicate API rate limits or transient connectivity issues.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {runsLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full bg-slate-700" />
              ))}
            </div>
          ) : runs && runs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Start</TableHead>
                  <TableHead className="hidden sm:table-cell">End</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Records</TableHead>
                  <TableHead className="hidden lg:table-cell">Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow
                    key={run.id}
                    className="border-slate-800 hover:bg-slate-800/50"
                  >
                    <TableCell className="font-medium text-white">
                      {run.dag_id}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={run.status} />
                    </TableCell>
                    <TableCell className="text-slate-400 hidden sm:table-cell">
                      {formatDateTime(run.start_time)}
                    </TableCell>
                    <TableCell className="text-slate-400 hidden sm:table-cell">
                      {formatDateTime(run.end_time)}
                    </TableCell>
                    <TableCell className="text-right text-slate-300 hidden md:table-cell">
                      {run.records_processed.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-red-400 text-sm hidden lg:table-cell max-w-xs truncate">
                      {run.error_message || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex h-32 items-center justify-center text-slate-500">
              No pipeline runs recorded
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {runsPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Showing {(page - 1) * perPage + 1}-
            {Math.min(page * perPage, runsTotal)} of {runsTotal} runs
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
              Page {page} of {runsPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(runsPages, p + 1))}
              disabled={page >= runsPages}
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
