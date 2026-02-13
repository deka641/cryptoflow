"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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
      api.getMe().then(setUser).catch(() => {
        localStorage.removeItem("access_token");
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
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
