import { nanoid } from "nanoid";
import { prisma } from "./prisma";
import { ApiError } from "./api-response";
import type { AccessCode } from "@prisma/client";

function randomSixDigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Generates a unique 6-digit PIN + opaque QR token, retrying on the rare collision. */
export async function generateUniqueAccessCredentials(): Promise<{
  code: string;
  qrToken: string;
}> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomSixDigitCode();
    const existing = await prisma.accessCode.findUnique({ where: { code } });
    if (!existing) {
      return { code, qrToken: nanoid(24) };
    }
  }
  throw new ApiError("Could not generate a unique access code, please retry", 500);
}

export type RecurrenceRule = {
  daysOfWeek: number[]; // 0=Sunday .. 6=Saturday
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
};

/** Evaluates whether `now` falls within an access code's valid window, including recurrence rules. */
export function isAccessCodeCurrentlyValid(
  accessCode: Pick<AccessCode, "validFrom" | "validUntil" | "recurrenceRule" | "type">,
  now: Date = new Date(),
): { valid: boolean; reason?: string } {
  if (now < accessCode.validFrom) {
    return { valid: false, reason: "Access code is not yet active" };
  }
  if (now > accessCode.validUntil) {
    return { valid: false, reason: "Access code has expired" };
  }

  if (accessCode.type === "RECURRING" && accessCode.recurrenceRule) {
    const rule = JSON.parse(accessCode.recurrenceRule) as RecurrenceRule;
    const currentDay = now.getDay();
    if (!rule.daysOfWeek.includes(currentDay)) {
      return { valid: false, reason: "Not a permitted day for this recurring pass" };
    }
    const [startH, startM] = rule.startTime.split(":").map(Number);
    const [endH, endM] = rule.endTime.split(":").map(Number);
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    const minutesStart = startH * 60 + startM;
    const minutesEnd = endH * 60 + endM;
    if (minutesNow < minutesStart || minutesNow > minutesEnd) {
      return { valid: false, reason: "Outside the permitted time window for this recurring pass" };
    }
  }

  return { valid: true };
}
