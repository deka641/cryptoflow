"use client";

import { AlertCircle } from "lucide-react";

interface UnavailableBadgeProps {
  message?: string;
  onRetry?: () => void;
}

export function UnavailableBadge({ message = "Data unavailable", onRetry }: UnavailableBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
      <AlertCircle className="size-3" />
      {message}
      {onRetry && (
        <button onClick={onRetry} className="ml-1 underline hover:text-slate-300" aria-label="Retry loading data">
          retry
        </button>
      )}
    </span>
  );
}
