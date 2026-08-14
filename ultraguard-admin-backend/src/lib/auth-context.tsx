"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiClientError, TOKEN_STORAGE_KEY } from "./api-client";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type AuthContextValue = {
  admin: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateAdmin: (admin: AdminUser) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    apiFetch<{ subjectType: string; admin: AdminUser }>("/api/auth/me")
      .then((data) => {
        if (data.subjectType === "admin") {
          setAdmin(data.admin);
        } else {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      })
      .catch(() => {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiFetch<{ token: string; admin: AdminUser }>("/api/auth/admin/login", {
        method: "POST",
        body: { email, password },
      });
      window.localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      setAdmin(data.admin);
      router.push("/dashboard");
    },
    [router],
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAdmin(null);
    router.push("/login");
  }, [router]);

  const updateAdmin = useCallback((next: AdminUser) => {
    setAdmin(next);
  }, []);

  return <AuthContext.Provider value={{ admin, loading, login, logout, updateAdmin }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export { ApiClientError };
