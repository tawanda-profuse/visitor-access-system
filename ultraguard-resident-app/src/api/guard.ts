import { apiRequest } from "./client";
import type { Gate, GuardVerifyResult } from "./types";

// Security Guard mode — every endpoint here is intentionally unauthenticated (no bearer
// token). A guard at a gate has no account; see app/guard/* for the UI that consumes these.

export function fetchGates() {
  return apiRequest<{ gates: Gate[] }>("/api/public/gates");
}

export function verifyGatePass(gateId: string, input: string, method: "PIN" | "QR") {
  return apiRequest<GuardVerifyResult>("/api/security-guard/verify", {
    method: "POST",
    body: { gateId, input, method },
  });
}
