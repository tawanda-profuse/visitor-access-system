import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { useAuth } from "./AuthContext";

export type AppLockPreference = "never" | "immediate" | "5min";

const PREFERENCE_KEY = "ultraguard.appLockPreference";
const BACKGROUNDED_AT_KEY = "ultraguard.appLockBackgroundedAt";
const THRESHOLD_MS: Record<Exclude<AppLockPreference, "never">, number> = {
  immediate: 0,
  "5min": 5 * 60 * 1000,
};

type AppLockContextValue = {
  preference: AppLockPreference;
  setPreference: (preference: AppLockPreference) => void;
  isSupported: boolean;
  isLoaded: boolean;
  isLocked: boolean;
  unlock: () => Promise<boolean>;
};

const AppLockContext = createContext<AppLockContextValue | undefined>(undefined);

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [preference, setPreferenceState] = useState<AppLockPreference>("never");
  const [isSupported, setIsSupported] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const preferenceRef = useRef(preference);
  preferenceRef.current = preference;

  useEffect(() => {
    (async () => {
      const [stored, hasHardware, isEnrolled] = await Promise.all([
        AsyncStorage.getItem(PREFERENCE_KEY),
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      if (stored === "never" || stored === "immediate" || stored === "5min") {
        setPreferenceState(stored);
      }
      setIsSupported(hasHardware && isEnrolled);
      setIsLoaded(true);
    })();
  }, []);

  const evaluateLock = async () => {
    const activePreference = preferenceRef.current;
    if (!tokenRef.current || activePreference === "never") {
      setIsLocked(false);
      return;
    }
    const storedAt = await AsyncStorage.getItem(BACKGROUNDED_AT_KEY);
    if (!storedAt) {
      setIsLocked(false);
      return;
    }
    const elapsed = Date.now() - Number(storedAt);
    const threshold = THRESHOLD_MS[activePreference];
    if (elapsed >= threshold) {
      setIsLocked(true);
    } else {
      await AsyncStorage.removeItem(BACKGROUNDED_AT_KEY);
      setIsLocked(false);
    }
  };

  // Cold start / session restore: check whether the app was backgrounded long enough
  // (possibly in a prior process, since a killed app loses all in-memory state) before
  // this session became authenticated. On logout, drop any stale backgrounded-at marker
  // so the next login (same or different resident) doesn't inherit a stale lock.
  useEffect(() => {
    if (token && isLoaded) {
      evaluateLock();
    } else if (!token) {
      setIsLocked(false);
      AsyncStorage.removeItem(BACKGROUNDED_AT_KEY).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isLoaded]);

  useEffect(() => {
    const onChange = (nextState: AppStateStatus) => {
      if (!tokenRef.current) return;
      if (nextState === "active") {
        evaluateLock();
      } else if (preferenceRef.current !== "never") {
        AsyncStorage.setItem(BACKGROUNDED_AT_KEY, String(Date.now())).catch(() => {});
      }
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, []);

  const setPreference = (next: AppLockPreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(PREFERENCE_KEY, next).catch(() => {});
    if (next === "never") {
      AsyncStorage.removeItem(BACKGROUNDED_AT_KEY).catch(() => {});
      setIsLocked(false);
    }
  };

  const unlock = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock Ultra-Guard",
      disableDeviceFallback: false,
      cancelLabel: "Cancel",
    });
    if (result.success) {
      await AsyncStorage.removeItem(BACKGROUNDED_AT_KEY);
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const value = useMemo(
    () => ({ preference, setPreference, isSupported, isLoaded, isLocked, unlock }),
    [preference, isSupported, isLoaded, isLocked],
  );

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
}

export function useAppLock() {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error("useAppLock must be used within an AppLockProvider");
  return ctx;
}
