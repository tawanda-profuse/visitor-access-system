import { EventEmitter } from "events";

// Process-wide pub/sub for the admin portal's live activity feed (SSE — see
// src/app/api/events/stream/route.ts). Deliberately in-memory: this app runs as a single
// standalone Node container (see Dockerfile), so there is one process to broadcast within.
// It would need swapping for a real broker (Redis pub/sub, etc.) behind a load balancer
// running multiple instances.

export type LiveEventType = "entry-log" | "panic-alert" | "gate" | "access-code" | "resident";

export type LiveEvent = {
  type: LiveEventType;
  action: "created" | "updated";
  data: unknown;
  at: string;
};

const emitter = new EventEmitter();
// Each open SSE connection holds one listener; raise the default cap (10) so a normal
// number of concurrently logged-in admins doesn't trigger Node's leak warning.
emitter.setMaxListeners(50);

const CHANNEL = "live-event";

export function publishEvent(type: LiveEventType, action: LiveEvent["action"], data: unknown) {
  const event: LiveEvent = { type, action, data, at: new Date().toISOString() };
  emitter.emit(CHANNEL, event);
}

export function subscribeToEvents(listener: (event: LiveEvent) => void): () => void {
  emitter.on(CHANNEL, listener);
  return () => emitter.off(CHANNEL, listener);
}
