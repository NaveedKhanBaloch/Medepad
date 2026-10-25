"use client";

// The signed-in admin, shared by every page.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError, setUnauthorizedHandler, tokenStore } from "./api";
import type { Admin } from "./types";

interface AuthValue {
  admin: Admin | null;
  loading: boolean;
  /** true while the server cannot be reached (it keeps retrying) */
  offline: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  logout: () => void;
  setAdmin: (a: Admin) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const logout = useCallback(() => {
    tokenStore.clear();
    setAdmin(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Only a "not signed in" answer (401) signs you out. If the server cannot be reached (restarting,
    // page reloading), keep the token and try again every few seconds.
    const check = async (): Promise<void> => {
      if (!tokenStore.get()) return;
      try {
        const me = await api.me();
        if (!stopped) setAdmin(me);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          tokenStore.clear();
          return;
        }
        if (stopped) return;
        setOffline(true);
        await new Promise<void>((resolve) => {
          timer = setTimeout(resolve, 3000);
        });
        if (!stopped) return check();
      }
    };
    check().finally(() => {
      if (!stopped) {
        setOffline(false);
        setLoading(false);
      }
    });
    return () => {
      stopped = true;
      clearTimeout(timer);
      setUnauthorizedHandler(null);
    };
  }, [logout]);

  const value = useMemo<AuthValue>(
    () => ({
      admin,
      loading,
      offline,
      setAdmin,
      logout,
      login: async (email, password, remember) => {
        const res = await api.login(email, password, remember);
        tokenStore.set(res.access_token, remember);
        setAdmin(res.admin);
      },
    }),
    [admin, loading, offline, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export const timeAgo = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};
