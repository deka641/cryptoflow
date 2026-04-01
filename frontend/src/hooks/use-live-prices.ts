"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/v1/ws/prices";

export type AlertTriggeredEvent = {
  alert_id: number;
  coin_id: number;
  symbol: string;
  name: string;
  direction: string;
  target_price: number;
  current_price: number;
};

type AlertCallback = (event: AlertTriggeredEvent) => void;

export function useLivePrices() {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [connected, setConnected] = useState(false);
  const [stale, setStale] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout>(undefined);
  const reconnectAttempt = useRef(0);
  const lastMessageAt = useRef(0);
  const alertCallbackRef = useRef<AlertCallback | null>(null);

  const onAlertTriggered = useCallback((cb: AlertCallback) => {
    alertCallbackRef.current = cb;
  }, []);

  useEffect(() => {
    lastMessageAt.current = Date.now();

    function connect() {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        reconnectAttempt.current = 0;
        lastMessageAt.current = Date.now();
        setStale(false);
      };

      ws.onmessage = (event) => {
        lastMessageAt.current = Date.now();
        setStale(false);
        try {
          const data = JSON.parse(event.data);
          if (data.type === "price_update" && data.prices) {
            setPrices((prev) => ({ ...prev, ...data.prices }));
          } else if (data.type === "alert_triggered" && data.data) {
            alertCallbackRef.current?.(data.data);
          }
        } catch (e) {
          console.warn("Failed to parse WebSocket message:", e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        setStale(false);
        clearTimeout(reconnectTimer.current);
        const baseDelay = Math.min(1000 * Math.pow(2, reconnectAttempt.current), 30_000);
        const jitter = Math.random() * 1000;
        reconnectTimer.current = setTimeout(connect, baseDelay + jitter);
        reconnectAttempt.current += 1;
      };

      ws.onerror = () => ws.close();
    }

    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const isStale = connected && now - lastMessageAt.current > 120_000;
      setStale(isStale);
    }, 10_000);
    return () => clearInterval(interval);
  }, [connected]);

  return { prices, connected, stale, onAlertTriggered };
}
