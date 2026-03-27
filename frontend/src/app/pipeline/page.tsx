"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import type { PipelineHealth, PipelineRun } from "@/types";
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
import { ChevronLeft, ChevronRight, Clock, Radio, Wifi, WifiOff, Activity, MessageSquare, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/formatters";

function HealthCard({ health }: { health: PipelineHealth }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card className={cn(
          "glass-card border-l-[3px] transition-all duration-300",
          health.is_healthy ? "border-l-emerald-500" : "border-l-red-500"
        )}>
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
                  Data freshness: {health.data_freshness_minutes < 60
                    ? `${health.data_freshness_minutes} min ago`
                    : `${Math.floor(health.data_freshness_minutes / 60)}h ${health.data_freshness_minutes % 60}min ago`}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex size-3 rounded-full transition-all duration-300",
                    health.is_healthy
                      ? "bg-emerald-500 animate-[pulse-dot_2s_infinite_ease-in-out] shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                      : "bg-red-500"
                  )}
                />
                <span className={cn(
                  "text-xs font-medium",
                  health.is_healthy ? "text-emerald-400" : "text-red-400"
                )}>
                  {health.is_healthy ? "Healthy" : "Unhealthy"}
                </span>
              </div>
              {health.last_run_status && (
                <StatusBadge status={health.last_run_status} />
              )}
            </div>
          </CardContent>
        </Card>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        sideOffset={6}
        className="max-w-xs border border-slate-700/50 bg-slate-800/95 backdrop-blur-md text-slate-300 shadow-xl shadow-black/20"
      >
        Green = last run succeeded and data is fresh. Red = failed or stale. Data freshness shows minutes since the last successful update.
      </TooltipContent>
    </Tooltip>
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
  const [healthError, setHealthError] = useState(false);
  const [runsError, setRunsError] = useState(false);
  const [dagFilter, setDagFilter] = useState<string>("all");
  const [wsStatus, setWsStatus] = useState<{
    active_connections: number;
    last_broadcast_at: number | null;
    seconds_since_broadcast: number | null;
    total_messages_broadcast: number;
    messages_per_minute: number;
    consumer_connected: boolean;
  } | null>(null);
  const [wsLoading, setWsLoading] = useState(true);
  const [wsError, setWsError] = useState(false);
  const perPage = 15;
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      setHealthLoading(true);
      setHealthError(false);
      const result = await api.getPipelineHealth();
      setHealth(result);
    } catch {
      setHealthError(true);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const fetchRuns = useCallback(async () => {
    try {
      setRunsLoading(true);
      setRunsError(false);
      const result = await api.getPipelineRuns(page, perPage, dagFilter === "all" ? undefined : dagFilter);
      setRuns(result.items);
      setRunsTotal(result.total);
      setRunsPages(result.pages);
    } catch {
      setRunsError(true);
    } finally {
      setRunsLoading(false);
    }
  }, [page, dagFilter]);

  const fetchWsStatus = useCallback(async () => {
    try {
      setWsLoading(true);
      setWsError(false);
      const result = await api.getWebSocketStatus();
      setWsStatus(result);
    } catch {
      setWsError(true);
    } finally {
      setWsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    refreshRef.current = setInterval(() => {
      fetchHealth();
      fetchRuns();
    }, 60000);
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, [fetchHealth, fetchRuns]);

  // Fetch WebSocket status on mount and poll every 30 seconds
  useEffect(() => {
    fetchWsStatus();
    wsRefreshRef.current = setInterval(fetchWsStatus, 30000);
    return () => {
      if (wsRefreshRef.current) clearInterval(wsRefreshRef.current);
    };
  }, [fetchWsStatus]);

  // Get unique dag_ids for filter dropdown
  const dagIds = health ? [...new Set(health.map((h) => h.dag_id))] : [];

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
        ) : healthError ? (
          <ErrorState message="Failed to load pipeline health data." onRetry={fetchHealth} compact />
        ) : health && health.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {health.map((h) => (
              <HealthCard key={h.dag_id} health={h} />
            ))}
          </div>
        ) : (
          <Card className="glass-card">
            <CardContent className="flex h-32 items-center justify-center text-slate-500">
              No pipeline health data available
            </CardContent>
          </Card>
        )}
      </div>

      {/* Real-Time Pipeline */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Real-Time Pipeline</h2>
        {wsLoading ? (
          <Skeleton className="h-40 w-full rounded-xl bg-slate-700" />
        ) : wsError ? (
          <ErrorState message="Failed to load real-time pipeline status." onRetry={fetchWsStatus} compact />
        ) : wsStatus ? (
          <Card className="glass-card border-l-[3px] border-l-blue-500">
            <CardContent className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Wifi className="size-4" />
                  <span>Connections</span>
                </div>
                <p className="text-2xl font-bold text-white">{wsStatus.active_connections}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Activity className="size-4" />
                  <span>Msgs / min</span>
                </div>
                <p className="text-2xl font-bold text-white">{wsStatus.messages_per_minute}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <MessageSquare className="size-4" />
                  <span>Last Broadcast</span>
                </div>
                <p className="text-sm font-medium text-white">
                  {wsStatus.seconds_since_broadcast !== null
                    ? `${wsStatus.seconds_since_broadcast.toFixed(0)}s ago`
                    : "Never"}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Radio className="size-4" />
                  <span>Consumer</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {wsStatus.consumer_connected ? (
                    <>
                      <Wifi className="size-4 text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-400">Connected</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="size-4 text-red-400" />
                      <span className="text-sm font-medium text-red-400">Disconnected</span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Runs Table */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-white">Pipeline Runs</CardTitle>
              <p className="text-xs text-slate-400 mt-1">
                Execution history of all pipeline runs, including start/end times, records processed, and any error messages.
              </p>
            </div>
            <Select value={dagFilter} onValueChange={(v) => { setDagFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[200px] bg-slate-800/50 border-slate-700 text-slate-300">
                <SelectValue placeholder="Filter by job" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-slate-300">All Jobs</SelectItem>
                {dagIds.map((dag) => (
                  <SelectItem key={dag} value={dag} className="text-slate-300">{dag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {runsLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full bg-slate-700" />
              ))}
            </div>
          ) : runsError ? (
            <div className="p-6">
              <ErrorState message="Failed to load pipeline runs." onRetry={fetchRuns} compact />
            </div>
          ) : runs && runs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent bg-slate-800/30">
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Start</TableHead>
                  <TableHead className="hidden sm:table-cell">Duration</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Records</TableHead>
                  <TableHead className="hidden lg:table-cell">Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow
                    key={run.id}
                    className="border-slate-800 hover:bg-slate-700/30 transition-colors duration-200"
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
                      {run.start_time && run.end_time
                        ? `${((new Date(run.end_time).getTime() - new Date(run.start_time).getTime()) / 1000).toFixed(1)}s`
                        : "-"}
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
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <GitBranch className="size-12 text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-slate-300">No Pipeline Runs Recorded</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-lg whitespace-pre-line">
                {"Pipeline runs are logged automatically by the cron scheduler:\n\u2022 Data Ingest \u2014 every 10 minutes\n\u2022 Daily Aggregates \u2014 daily at 03:00 UTC\n\u2022 Analytics Computation \u2014 daily at 04:00 UTC\n\u2022 Data Quality Checks \u2014 every hour"}
              </p>
              <p className="text-sm text-slate-500 mt-2 max-w-lg">
                The first runs will appear here after the scheduler starts.
              </p>
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
