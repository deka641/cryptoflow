"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/api/v1/ws/prices";

export function useLivePrices() {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout>(undefined);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "price_update" && data.prices) {
          setPrices((prev) => ({ ...prev, ...data.prices }));
        }
      } catch {}
    };

    ws.onclose = () => {
      setConnected(false);
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { prices, connected };
}
