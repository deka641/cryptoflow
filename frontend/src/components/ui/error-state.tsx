"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

export function ErrorState({
  message = "Failed to load data",
  onRetry,
  className,
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/5",
        compact ? "gap-3 px-4 py-3" : "flex-col gap-3 py-12",
        className
      )}
    >
      <AlertCircle className={cn("text-red-400", compact ? "size-4" : "size-6")} />
      <p className={cn("text-slate-400", compact ? "text-sm" : "text-sm text-center")}>{message}</p>
      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="text-slate-400 hover:text-white"
        >
          <RefreshCw className="size-3.5 mr-1.5" />
          Retry
        </Button>
      )}
    </div>
  );
}
