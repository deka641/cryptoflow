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
