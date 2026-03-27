"use client";

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { User } from "@/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      api.getMe().then(setUser).catch((err: Error & { status?: number }) => {
        if (err.status === 401) {
          localStorage.removeItem("access_token");
        }
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Track whether user was previously authenticated for session expiry detection
  const wasAuthenticatedRef = useRef(false);
  useEffect(() => {
    if (user) wasAuthenticatedRef.current = true;
  }, [user]);

  // Proactive token refresh: check every 10 minutes, refresh if token expires within 30 minutes
  useEffect(() => {
    const checkRefresh = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) return;
      try {
        // Decode JWT payload to check expiry (base64url decode)
        const parts = token.split(".");
        if (parts.length !== 3) return;
        const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        const exp = payload.exp;
        if (!exp) return;
        const minutesUntilExpiry = (exp * 1000 - Date.now()) / 60000;
        if (minutesUntilExpiry < 30) {
          // Token expires within 30 minutes — refresh it
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/auth/refresh`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );
          if (res.ok) {
            const data = await res.json();
            if (data.access_token) {
              localStorage.setItem("access_token", data.access_token);
            }
          }
        }
      } catch {
        // Silently ignore — the 401 interceptor will handle expired tokens
      }
    };
    const interval = setInterval(checkRefresh, 10 * 60 * 1000); // every 10 minutes
    return () => clearInterval(interval);
  }, []);

  // Listen for global 401 logout events (e.g. expired token during API calls)
  useEffect(() => {
    const handleLogout = () => {
      if (wasAuthenticatedRef.current) {
        toast.info("Session expired — please sign in again");
        wasAuthenticatedRef.current = false;
      }
      setUser(null);
    };
    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, []);

  const login = async (email: string, password: string) => {
    await api.login(email, password);
    const me = await api.getMe();
    setUser(me);
  };

  const register = async (email: string, password: string, fullName?: string) => {
    await api.register(email, password, fullName);
    await login(email, password);
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
