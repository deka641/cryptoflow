"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { MarketOverview, Coin, PaginatedResponse, KpiSparklines } from "@/types";

export function useMarketOverview() {
  const [data, setData] = useState<MarketOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasToasted = useRef(false);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.getMarketOverview();
      setData(result);
      setError(null);
      hasToasted.current = false;
    } catch (e: any) {
      setError(e.message);
      if (!hasToasted.current) {
        toast.error("Failed to load market overview");
        hasToasted.current = true;
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, 60000);
    return () => clearInterval(interval);
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useCoins(page = 1, perPage = 20, search = "", sortBy = "market_cap_rank", sortDir = "asc") {
  const [data, setData] = useState<PaginatedResponse<Coin> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasToasted = useRef(false);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.getCoins(page, perPage, search, sortBy, sortDir);
      setData(result);
      setError(null);
      hasToasted.current = false;
    } catch (e: any) {
      setError(e.message);
      if (!hasToasted.current) {
        toast.error("Failed to load coins");
        hasToasted.current = true;
      }
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, sortBy, sortDir]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useKpiSparklines() {
  const [data, setData] = useState<KpiSparklines | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.getKpiSparklines()
      .then((result) => { if (!cancelled) setData(result); })
      .catch(() => { /* sparklines are optional, fail silently */ });
    return () => { cancelled = true; };
  }, []);

  return data;
}
