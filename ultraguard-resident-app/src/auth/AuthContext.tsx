import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchMe } from "@/api/resident";
import { deleteToken, getToken, setToken as persistToken } from "./tokenStorage";
import type { Resident } from "@/api/types";

const TOKEN_KEY = "ultraguard.residentToken";

type AuthContextValue = {
  token: string | null;
  resident: Resident | null;
  isLoading: boolean;
  login: (token: string, resident: Resident) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [resident, setResident] = useState<Resident | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await getToken(TOKEN_KEY);
        if (stored) {
          const me = await fetchMe(stored);
          setToken(stored);
          setResident(me.resident);
        }
      } catch {
        await deleteToken(TOKEN_KEY).catch(() => {});
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (nextToken: string, nextResident: Resident) => {
    await persistToken(TOKEN_KEY, nextToken);
    setToken(nextToken);
    setResident(nextResident);
  };

  const logout = async () => {
    await deleteToken(TOKEN_KEY).catch(() => {});
    setToken(null);
    setResident(null);
  };

  const value = useMemo(
    () => ({ token, resident, isLoading, login, logout }),
    [token, resident, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
