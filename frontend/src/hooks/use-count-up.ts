"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animate a number from 0 to the target value with an ease-out curve.
 * Only animates on the first non-zero target (initial load).
 * Subsequent target changes update via rAF callback (async, lint-safe).
 */
export function useCountUp(target: number | null, duration = 800): number | null {
  const [value, setValue] = useState<number | null>(null);
  const hasAnimated = useRef(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (target === null) return;

    if (hasAnimated.current) {
      // Use rAF to avoid synchronous setState in effect body
      rafRef.current = requestAnimationFrame(() => {
        setValue(target);
      });
      return () => cancelAnimationFrame(rafRef.current);
    }

    hasAnimated.current = true;
    const startTime = performance.now();
    const animTarget = target;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(animTarget * eased);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setValue(animTarget);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}
