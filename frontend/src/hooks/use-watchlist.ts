"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/providers/auth-provider";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function useWatchlist() {
  const { user } = useAuth();
  const [coinIds, setCoinIds] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const fetchWatchlist = async () => {
      setLoading(true);
      try {
        const data = await api.getWatchlist();
        if (!cancelled) setCoinIds(data.coin_ids);
      } catch {
        if (!cancelled) setCoinIds([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchWatchlist();
    return () => { cancelled = true; };
  }, [user]);

  const watchlist = useMemo(
    () => new Set(user ? (coinIds ?? []) : []),
    [user, coinIds]
  );

  const isWatched = useCallback(
    (coinId: number) => watchlist.has(coinId),
    [watchlist]
  );

  const toggle = useCallback(
    async (coinId: number) => {
      if (!user) {
        toast.error("Log in to save your watchlist");
        return;
      }

      const wasWatched = watchlist.has(coinId);

      // Optimistic update
      setCoinIds((prev) => {
        const current = prev ?? [];
        if (wasWatched) {
          return current.filter((id) => id !== coinId);
        }
        return [...current, coinId];
      });

      try {
        if (wasWatched) {
          await api.removeFromWatchlist(coinId);
          toast.success("Removed from watchlist");
        } else {
          await api.addToWatchlist(coinId);
          toast.success("Added to watchlist");
        }
      } catch {
        // Rollback on error
        setCoinIds((prev) => {
          const current = prev ?? [];
          if (wasWatched) {
            return [...current, coinId];
          }
          return current.filter((id) => id !== coinId);
        });
        toast.error("Failed to update watchlist");
      }
    },
    [user, watchlist]
  );

  return { watchlist, toggle, isWatched, loading };
}
