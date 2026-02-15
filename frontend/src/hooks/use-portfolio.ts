"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/providers/auth-provider";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { PortfolioHolding, PortfolioSummary } from "@/types";

export function usePortfolio() {
  const { user } = useAuth();
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [h, s] = await Promise.all([
        api.getPortfolioHoldings(),
        api.getPortfolioSummary(),
      ]);
      setHoldings(h);
      setSummary(s);
    } catch {
      setHoldings([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setHoldings([]);
      setSummary(null);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const [h, s] = await Promise.all([
          api.getPortfolioHoldings(),
          api.getPortfolioSummary(),
        ]);
        if (!cancelled) {
          setHoldings(h);
          setSummary(s);
        }
      } catch {
        if (!cancelled) {
          setHoldings([]);
          setSummary(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user]);

  const addHolding = useCallback(async (data: { coin_id: number; quantity: number; buy_price_usd: number; notes?: string }) => {
    try {
      await api.addPortfolioHolding(data);
      toast.success("Holding added");
      await fetchData();
    } catch {
      toast.error("Failed to add holding");
    }
  }, [fetchData]);

  const updateHolding = useCallback(async (id: number, data: { quantity?: number; buy_price_usd?: number; notes?: string }) => {
    try {
      await api.updatePortfolioHolding(id, data);
      toast.success("Holding updated");
      await fetchData();
    } catch {
      toast.error("Failed to update holding");
    }
  }, [fetchData]);

  const deleteHolding = useCallback(async (id: number) => {
    // Optimistic delete
    const prev = holdings;
    setHoldings((h) => h.filter((x) => x.id !== id));
    try {
      await api.deletePortfolioHolding(id);
      toast.success("Holding removed");
      await fetchData();
    } catch {
      setHoldings(prev);
      toast.error("Failed to remove holding");
    }
  }, [holdings, fetchData]);

  return { holdings, summary, loading, addHolding, updateHolding, deleteHolding, refetch: fetchData };
}
