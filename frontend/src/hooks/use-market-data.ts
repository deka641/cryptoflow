"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { MarketOverview, Coin, PaginatedResponse } from "@/types";

export function useMarketOverview() {
  const [data, setData] = useState<MarketOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.getMarketOverview();
      setData(result);
      setError(null);
    } catch (e: any) {
      setError(e.message);
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

export function useCoins(page = 1, perPage = 20, search = "") {
  const [data, setData] = useState<PaginatedResponse<Coin> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.getCoins(page, perPage, search);
      setData(result);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
