"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { residentApiFetch, ApiClientError, RESIDENT_TOKEN_STORAGE_KEY } from "./resident-api-client";
import type { ResidentSession } from "./resident-types";

type ResidentAuthContextValue = {
  resident: ResidentSession | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
};

const ResidentAuthContext = createContext<ResidentAuthContextValue | null>(null);

export function ResidentAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [resident, setResident] = useState<ResidentSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = window.localStorage.getItem(RESIDENT_TOKEN_STORAGE_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    residentApiFetch<{ subjectType: string; resident: ResidentSession }>("/api/auth/me")
      .then((data) => {
        if (data.subjectType === "resident") {
          setResident(data.resident);
        } else {
          window.localStorage.removeItem(RESIDENT_TOKEN_STORAGE_KEY);
        }
      })
      .catch(() => {
        window.localStorage.removeItem(RESIDENT_TOKEN_STORAGE_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const data = await residentApiFetch<{ token: string; resident: ResidentSession }>(
        "/api/auth/resident/login",
        { method: "POST", body: { identifier, password } },
      );
      window.localStorage.setItem(RESIDENT_TOKEN_STORAGE_KEY, data.token);
      setResident(data.resident);
      router.push("/resident/dashboard");
    },
    [router],
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem(RESIDENT_TOKEN_STORAGE_KEY);
    setResident(null);
    router.push("/resident/login");
  }, [router]);

  return (
    <ResidentAuthContext.Provider value={{ resident, loading, login, logout }}>
      {children}
    </ResidentAuthContext.Provider>
  );
}

export function useResidentAuth() {
  const ctx = useContext(ResidentAuthContext);
  if (!ctx) throw new Error("useResidentAuth must be used within a ResidentAuthProvider");
  return ctx;
}

export { ApiClientError };
