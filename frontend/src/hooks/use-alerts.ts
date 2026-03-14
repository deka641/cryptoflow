"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { formatCurrency } from "@/lib/formatters";
import type { PriceAlert } from "@/types";

export function useAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const toastRef = useRef(false);

  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await api.getAlerts();
      setAlerts(data);
    } catch {
      if (!toastRef.current) {
        toast.error("Failed to load alerts");
        toastRef.current = true;
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createAlert = useCallback(
    async (coinId: number, targetPrice: number, direction: string) => {
      const result = await api.createAlert({
        coin_id: coinId,
        target_price: targetPrice,
        direction,
      });
      setAlerts((prev) => [result, ...prev.filter((a) => a.id !== result.id)]);
      toast.success(`Alert set: ${result.symbol.toUpperCase()} ${direction} ${formatCurrency(targetPrice)}`);
      return result;
    },
    []
  );

  const deleteAlert = useCallback(async (id: number) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    try {
      await api.deleteAlert(id);
      toast.success("Alert removed");
    } catch {
      fetchAlerts(); // rollback
      toast.error("Failed to remove alert");
    }
  }, [fetchAlerts]);

  // Check for triggered alerts periodically
  const checkTriggered = useCallback(async () => {
    if (!user) return;
    try {
      const result = await api.checkAlerts();
      if (result.triggered.length > 0) {
        for (const t of result.triggered) {
          toast.info(
            `${t.symbol.toUpperCase()} ${t.direction === "above" ? "rose above" : "fell below"} ${formatCurrency(t.target_price)} (now ${formatCurrency(t.current_price)})`,
            { duration: 10000 }
          );
        }
        fetchAlerts(); // refresh to update triggered state
      }
    } catch {
      // silent
    }
  }, [user, fetchAlerts]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Check every 60 seconds
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkTriggered, 60_000);
    return () => clearInterval(interval);
  }, [user, checkTriggered]);

  return { alerts, loading, createAlert, deleteAlert, refetch: fetchAlerts };
}
