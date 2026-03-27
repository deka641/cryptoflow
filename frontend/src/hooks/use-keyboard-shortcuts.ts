"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

export const SHORTCUTS = [
  { keys: ["g", "d"], label: "Go to Dashboard", path: "/" },
  { keys: ["g", "m"], label: "Go to Market", path: "/market" },
  { keys: ["g", "a"], label: "Go to Analytics", path: "/analytics" },
  { keys: ["g", "p"], label: "Go to Portfolio", path: "/portfolio" },
  { keys: ["g", "c"], label: "Go to Compare", path: "/compare" },
  { keys: ["g", "q"], label: "Go to Quality", path: "/quality" },
  { keys: ["g", "i"], label: "Go to Pipeline", path: "/pipeline" },
  { keys: ["g", "l"], label: "Go to Alerts", path: "/alerts" },
] as const;

const SEQUENCE_TIMEOUT = 1000;

export function useKeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false);
  const router = useRouter();
  const pendingKeyRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPending = useCallback(() => {
    pendingKeyRef.current = null;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in inputs, textareas, or contenteditable elements
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      // Ignore when modifier keys are held (except shift for ?)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const key = e.key.toLowerCase();

      // "?" shortcut to toggle help dialog
      if (e.key === "?") {
        e.preventDefault();
        clearPending();
        setShowHelp((prev) => !prev);
        return;
      }

      // Two-key sequence handling
      if (pendingKeyRef.current) {
        const firstKey = pendingKeyRef.current;
        clearPending();

        const match = SHORTCUTS.find(
          (s) => s.keys[0] === firstKey && s.keys[1] === key
        );
        if (match) {
          e.preventDefault();
          router.push(match.path);
        }
        return;
      }

      // Check if this key starts a sequence
      const startsSequence = SHORTCUTS.some((s) => s.keys[0] === key);
      if (startsSequence) {
        e.preventDefault();
        pendingKeyRef.current = key;
        timeoutRef.current = setTimeout(() => {
          pendingKeyRef.current = null;
          timeoutRef.current = null;
        }, SEQUENCE_TIMEOUT);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearPending();
    };
  }, [router, clearPending]);

  return { showHelp, setShowHelp };
}
