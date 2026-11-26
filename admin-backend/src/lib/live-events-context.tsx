"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { TOKEN_STORAGE_KEY } from "./api-client";

export type LiveEventType = "entry-log" | "panic-alert" | "gate" | "access-code" | "resident";

export type LiveEvent = {
  type: LiveEventType;
  action: "created" | "updated";
  data: unknown;
  at: string;
};

type Listener = (event: LiveEvent) => void;

type LiveEventsContextValue = {
  connected: boolean;
  subscribe: (listener: Listener) => () => void;
};

const LiveEventsContext = createContext<LiveEventsContextValue | null>(null);

export function LiveEventsProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const listenersRef = useRef<Set<Listener>>(new Set());

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) return;

    const source = new EventSource(`/api/events/stream?token=${encodeURIComponent(token)}`);
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as LiveEvent;
        listenersRef.current.forEach((listener) => listener(event));
      } catch {
        // ignore malformed/keep-alive frames
      }
    };

    return () => source.close();
  }, []);

  const subscribe = useCallback((listener: Listener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  return <LiveEventsContext.Provider value={{ connected, subscribe }}>{children}</LiveEventsContext.Provider>;
}

// Subscribes `onEvent` to the given event types for the lifetime of the calling component.
// `onEvent` is read via ref so callers can pass an inline arrow function without triggering
// a resubscribe on every render.
export function useLiveEvents(types: LiveEventType[], onEvent: Listener) {
  const ctx = useContext(LiveEventsContext);
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;
  const typesKey = types.join(",");

  useEffect(() => {
    if (!ctx) return;
    return ctx.subscribe((event) => {
      if (types.includes(event.type)) callbackRef.current(event);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, typesKey]);
}

export function useLiveConnectionStatus(): boolean {
  const ctx = useContext(LiveEventsContext);
  return ctx?.connected ?? false;
}
