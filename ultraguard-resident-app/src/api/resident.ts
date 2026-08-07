import { apiRequest } from "./client";
import type { AccessCode, AccessCodeType, EntryLog, PanicAlert, Resident } from "./types";

export function requestOtp(phone: string) {
  return apiRequest<{ message: string; devOtp?: string }>("/api/auth/resident/request-otp", {
    method: "POST",
    body: { phone },
  });
}

export function verifyOtp(phone: string, otp: string) {
  return apiRequest<{ token: string; resident: Resident }>("/api/auth/resident/verify-otp", {
    method: "POST",
    body: { phone, otp },
  });
}

export function fetchMe(token: string) {
  return apiRequest<{ subjectType: "resident"; resident: Resident }>("/api/auth/me", { token });
}

export function fetchAccessCodes(token: string) {
  return apiRequest<{ accessCodes: AccessCode[] }>("/api/access-codes", { token });
}

export type CreateAccessCodeInput = {
  type: AccessCodeType;
  visitorName: string;
  visitorPhone?: string;
  validFrom?: string;
  validUntil: string;
  maxUses?: number;
  recurrenceRule?: { daysOfWeek: number[]; startTime: string; endTime: string };
};

export function createAccessCode(token: string, input: CreateAccessCodeInput) {
  return apiRequest<{ accessCode: AccessCode }>("/api/access-codes", {
    method: "POST",
    token,
    body: input,
  });
}

export function fetchAccessCode(token: string, id: string) {
  return apiRequest<{ accessCode: AccessCode }>(`/api/access-codes/${id}`, { token });
}

export function revokeAccessCode(token: string, id: string) {
  return apiRequest<{ accessCode: AccessCode }>(`/api/access-codes/${id}`, {
    method: "PATCH",
    token,
    body: { action: "revoke" },
  });
}

export function fetchEntryLogs(token: string) {
  return apiRequest<{ entryLogs: EntryLog[] }>("/api/entry-logs", { token });
}

export function triggerPanicAlert(token: string, message?: string) {
  return apiRequest<{ panicAlert: PanicAlert }>("/api/panic", {
    method: "POST",
    token,
    body: { message },
  });
}

export function fetchPanicAlerts(token: string) {
  return apiRequest<{ panicAlerts: PanicAlert[] }>("/api/panic", { token });
}

export function registerPushToken(token: string, pushToken: string) {
  return apiRequest<{ message: string }>("/api/notifications/register-device", {
    method: "POST",
    token,
    body: { pushToken },
  });
}
