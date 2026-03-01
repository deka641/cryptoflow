"use client";

import { useState, useEffect } from "react";

/**
 * Tracks live price changes and returns flash direction for animation.
 * Returns { displayPrice, flash, flashKey } for use in price cells.
 */
export function usePriceFlash(
  livePrice: number | undefined,
  fallbackPrice: number | null
) {
  const displayPrice = livePrice ?? fallbackPrice;
  const [prevLivePrice, setPrevLivePrice] = useState(livePrice);
  const [flash, setFlash] = useState<"green" | "red" | null>(null);
  const [flashKey, setFlashKey] = useState(0);

  // Adjust state during render (React recommended pattern for prop-derived state)
  if (livePrice !== prevLivePrice) {
    setPrevLivePrice(livePrice);
    if (livePrice !== undefined && prevLivePrice !== undefined) {
      setFlash(livePrice > prevLivePrice ? "green" : "red");
      setFlashKey((k) => k + 1);
    }
  }

  // Clear flash after animation completes
  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 600);
    return () => clearTimeout(timer);
  }, [flash]);

  return { displayPrice, flash, flashKey };
}
