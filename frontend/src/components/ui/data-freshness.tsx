"use client";

import { useState, useEffect } from "react";

export function DataFreshness({ lastUpdated }: { lastUpdated: string }) {
  const [minutesAgo, setMinutesAgo] = useState<number>(() =>
    Math.round((Date.now() - new Date(lastUpdated).getTime()) / 60000)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setMinutesAgo(Math.round((Date.now() - new Date(lastUpdated).getTime()) / 60000));
    }, 30000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const dotColor =
    minutesAgo < 15
      ? "bg-emerald-400 animate-pulse"
      : minutesAgo < 60
        ? "bg-yellow-400"
        : "bg-red-400";

  const label =
    minutesAgo < 1
      ? "just now"
      : minutesAgo < 60
        ? `${minutesAgo} min ago`
        : `${Math.floor(minutesAgo / 60)}h ${minutesAgo % 60}m ago`;

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <span className={`inline-block size-2 rounded-full ${dotColor}`} />
      <span>Last updated: {label}</span>
    </div>
  );
}
