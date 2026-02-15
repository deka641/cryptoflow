"use client";

import {
  Database,
  Globe,
  Zap,
  Clock,
  Radio,
  Server,
  MonitorSmartphone,
  ArrowRight,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const layerColors = {
  indigo: {
    border: "border-indigo-500/40",
    bg: "bg-indigo-500/10",
    iconBg: "bg-indigo-500/15",
    iconText: "text-indigo-400",
    dot: "bg-indigo-400",
  },
  emerald: {
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/10",
    iconBg: "bg-emerald-500/15",
    iconText: "text-emerald-400",
    dot: "bg-emerald-400",
  },
  violet: {
    border: "border-violet-500/40",
    bg: "bg-violet-500/10",
    iconBg: "bg-violet-500/15",
    iconText: "text-violet-400",
    dot: "bg-violet-400",
  },
  cyan: {
    border: "border-cyan-500/40",
    bg: "bg-cyan-500/10",
    iconBg: "bg-cyan-500/15",
    iconText: "text-cyan-400",
    dot: "bg-cyan-400",
  },
};

type ColorKey = keyof typeof layerColors;

function DiagramBox({
  icon,
  title,
  subtitle,
  color,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  color: ColorKey;
}) {
  const c = layerColors[color];
  return (
    <div
      className={cn(
        "rounded-xl border-2 p-4 transition-all duration-300 hover:-translate-y-0.5",
        c.border,
        c.bg
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("rounded-lg p-2", c.iconBg, c.iconText)}>{icon}</div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function FlowArrowRight({ color = "slate" }: { color?: string }) {
  return (
    <div className="hidden lg:flex items-center justify-center px-1">
      <div className="relative flex items-center">
        <div className="h-0.5 w-8 bg-slate-600" />
        <ArrowRight className={cn("size-4", color === "emerald" ? "text-emerald-500/60" : "text-slate-500")} />
        <span
          className={cn(
            "absolute top-1/2 -translate-y-1/2 size-1.5 rounded-full",
            color === "emerald" ? "bg-emerald-400" : "bg-indigo-400"
          )}
          style={{ animation: "flow-dot 2s infinite ease-in-out" }}
        />
      </div>
    </div>
  );
}

function FlowArrowDown() {
  return (
    <div className="flex lg:hidden items-center justify-center py-2">
      <div className="flex flex-col items-center">
        <div className="w-0.5 h-6 bg-slate-600" />
        <ArrowDown className="size-4 text-slate-500" />
      </div>
    </div>
  );
}

function LayerLabel({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-2 text-center">
      {label}
    </p>
  );
}

export function ArchitectureDiagram() {
  return (
    <div>
      {/* Desktop layout: horizontal flow */}
      <div className="hidden lg:flex lg:items-start lg:gap-2">
        {/* Data Sources */}
        <div className="flex-1 min-w-0">
          <LayerLabel label="Data Sources" />
          <div className="space-y-3">
            <DiagramBox
              icon={<Globe className="size-4" />}
              title="CoinGecko REST"
              subtitle="Batch, every 10 min"
              color="indigo"
            />
            <DiagramBox
              icon={<Zap className="size-4" />}
              title="CoinCap WebSocket"
              subtitle="Real-time stream"
              color="emerald"
            />
          </div>
        </div>

        <FlowArrowRight />

        {/* Processing */}
        <div className="flex-1 min-w-0">
          <LayerLabel label="Processing" />
          <div className="space-y-3">
            <DiagramBox
              icon={<Clock className="size-4" />}
              title="Cron Jobs"
              subtitle="4 Python scripts"
              color="indigo"
            />
            <DiagramBox
              icon={<Radio className="size-4" />}
              title="WS Consumer"
              subtitle="Async Python process"
              color="emerald"
            />
          </div>
        </div>

        <FlowArrowRight />

        {/* Storage */}
        <div className="flex-1 min-w-0">
          <LayerLabel label="Storage" />
          <div className="space-y-3">
            <DiagramBox
              icon={<Database className="size-4" />}
              title="PostgreSQL"
              subtitle="Star schema warehouse"
              color="violet"
            />
            <DiagramBox
              icon={<Server className="size-4" />}
              title="Redis"
              subtitle="Pub/Sub message broker"
              color="emerald"
            />
          </div>
        </div>

        <FlowArrowRight />

        {/* API */}
        <div className="flex-1 min-w-0">
          <LayerLabel label="API Layer" />
          <div className="space-y-3">
            <DiagramBox
              icon={<Server className="size-4" />}
              title="FastAPI REST"
              subtitle="Serves precomputed data"
              color="indigo"
            />
            <DiagramBox
              icon={<Zap className="size-4" />}
              title="FastAPI WebSocket"
              subtitle="Broadcasts live prices"
              color="emerald"
            />
          </div>
        </div>

        <FlowArrowRight />

        {/* Frontend */}
        <div className="flex-1 min-w-0">
          <LayerLabel label="Frontend" />
          <div className="space-y-3">
            <DiagramBox
              icon={<MonitorSmartphone className="size-4" />}
              title="Next.js Dashboard"
              subtitle="Charts, tables, live data"
              color="cyan"
            />
          </div>
        </div>
      </div>

      {/* Mobile layout: vertical flow */}
      <div className="lg:hidden space-y-0">
        <LayerLabel label="Data Sources" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DiagramBox
            icon={<Globe className="size-4" />}
            title="CoinGecko REST"
            subtitle="Batch, every 10 min"
            color="indigo"
          />
          <DiagramBox
            icon={<Zap className="size-4" />}
            title="CoinCap WebSocket"
            subtitle="Real-time stream"
            color="emerald"
          />
        </div>
        <FlowArrowDown />

        <LayerLabel label="Processing" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DiagramBox
            icon={<Clock className="size-4" />}
            title="Cron Jobs"
            subtitle="4 Python scripts"
            color="indigo"
          />
          <DiagramBox
            icon={<Radio className="size-4" />}
            title="WS Consumer"
            subtitle="Async Python process"
            color="emerald"
          />
        </div>
        <FlowArrowDown />

        <LayerLabel label="Storage" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DiagramBox
            icon={<Database className="size-4" />}
            title="PostgreSQL"
            subtitle="Star schema warehouse"
            color="violet"
          />
          <DiagramBox
            icon={<Server className="size-4" />}
            title="Redis"
            subtitle="Pub/Sub message broker"
            color="emerald"
          />
        </div>
        <FlowArrowDown />

        <LayerLabel label="API Layer" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DiagramBox
            icon={<Server className="size-4" />}
            title="FastAPI REST"
            subtitle="Serves precomputed data"
            color="indigo"
          />
          <DiagramBox
            icon={<Zap className="size-4" />}
            title="FastAPI WebSocket"
            subtitle="Broadcasts live prices"
            color="emerald"
          />
        </div>
        <FlowArrowDown />

        <LayerLabel label="Frontend" />
        <DiagramBox
          icon={<MonitorSmartphone className="size-4" />}
          title="Next.js Dashboard"
          subtitle="Charts, tables, live data"
          color="cyan"
        />
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-indigo-500" />
          Batch pipeline
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500" />
          Real-time pipeline
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-violet-500" />
          Data warehouse
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-cyan-500" />
          Presentation
        </div>
      </div>
    </div>
  );
}
