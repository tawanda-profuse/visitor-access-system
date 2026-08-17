import type { Gate, Property } from "@prisma/client";
import { prisma } from "./prisma";
import { isAccessCodeCurrentlyValid } from "./access-codes";
import { sendPushNotification } from "./push";
import { publishEvent } from "./event-bus";

export type VerifiedVia = "HARDWARE" | "SECURITY_GUARD";

export type GuardResultCode =
  | "NOT_FOUND"
  | "WRONG_LOCATION"
  | "REVOKED"
  | "USED"
  | "EXPIRED"
  | "DENIED"
  | "SUCCESS";

// The legacy, coarser set of values written to EntryLog.result and returned to gate
// hardware — kept stable so existing device integrations (see
// docs/HARDWARE_INTEGRATION_PROTOCOL.md) don't need to change their branching logic.
type EntryLogResult = "INVALID" | "WRONG_LOCATION" | "DENIED" | "EXPIRED" | "SUCCESS";

const RESULT_TO_ENTRY_LOG: Record<GuardResultCode, EntryLogResult> = {
  NOT_FOUND: "INVALID",
  WRONG_LOCATION: "WRONG_LOCATION",
  REVOKED: "DENIED",
  USED: "DENIED",
  EXPIRED: "EXPIRED",
  DENIED: "DENIED",
  SUCCESS: "SUCCESS",
};

export type GateWithProperty = Gate & { property: Property };

export type VerifyAccessResult = {
  resultCode: GuardResultCode;
  entryLogResult: EntryLogResult;
  gateAction: "OPEN" | "DENY";
  message: string;
  visit?: {
    visitorName: string;
    gate: { id: string; name: string };
    property: { id: string; name: string; address: string };
  };
};

/**
 * The single implementation behind both gate-hardware validation and Security Guard
 * mode verification. `gate` should already be authenticated/looked-up by the caller
 * (hardware: x-gate-api-key check; guard mode: no auth, gateId is just required) —
 * this function only decides whether the code is valid *at that gate*, writes the
 * EntryLog, and publishes the live-event.
 *
 * Check order: not-found -> wrong-location -> revoked/used -> expiry/recurrence
 * window -> max-uses -> success. Wrong-location is checked before status so a code
 * that's simply being used at the wrong property gets that specific, actionable
 * message rather than a generic denial.
 */
export async function verifyAccessAtGate(params: {
  gate: GateWithProperty | null;
  input: string;
  method: "PIN" | "QR";
  verifiedVia: VerifiedVia;
}): Promise<VerifyAccessResult> {
  const { gate, input, method, verifiedVia } = params;

  const accessCode = await prisma.accessCode.findFirst({
    where: method === "PIN" ? { code: input } : { qrToken: input },
    include: { resident: { include: { units: { include: { unit: true } } } } },
  });

  const logBase = {
    gateId: gate?.id,
    method,
    verifiedVia,
    visitorName: accessCode?.visitorName,
    accessCodeId: accessCode?.id,
    residentId: accessCode?.residentId,
  };

  async function respond(resultCode: GuardResultCode, message: string, reason?: string) {
    const entryLogResult = RESULT_TO_ENTRY_LOG[resultCode];
    const entryLog = await prisma.entryLog.create({
      data: { ...logBase, result: entryLogResult, reason: reason ?? message },
      include: { gate: true, resident: true, accessCode: true },
    });
    publishEvent("entry-log", "created", entryLog);

    return {
      resultCode,
      entryLogResult,
      gateAction: resultCode === "SUCCESS" ? ("OPEN" as const) : ("DENY" as const),
      message,
    };
  }

  if (!accessCode) {
    return respond("NOT_FOUND", "Code not recognized");
  }

  if (gate) {
    const residentPropertyIds = new Set(accessCode.resident.units.map((ru) => ru.unit.propertyId));
    if (!residentPropertyIds.has(gate.propertyId)) {
      return respond("WRONG_LOCATION", "This access code is not valid at this location");
    }
  }

  if (accessCode.status === "REVOKED") {
    return respond("REVOKED", "Code was revoked");
  }

  if (accessCode.status === "USED" && accessCode.type !== "RECURRING") {
    return respond("USED", "Code already used");
  }

  const validity = isAccessCodeCurrentlyValid(accessCode);
  if (!validity.valid) {
    const expired = new Date() > accessCode.validUntil;
    if (expired && accessCode.status === "ACTIVE") {
      await prisma.accessCode.update({ where: { id: accessCode.id }, data: { status: "EXPIRED" } });
    }
    return respond(expired ? "EXPIRED" : "DENIED", validity.reason ?? "Access denied");
  }

  if (accessCode.useCount >= accessCode.maxUses) {
    return respond("DENIED", "Maximum uses reached");
  }

  const newUseCount = accessCode.useCount + 1;
  await prisma.accessCode.update({
    where: { id: accessCode.id },
    data: {
      useCount: newUseCount,
      status: accessCode.type === "ONE_TIME" || newUseCount >= accessCode.maxUses ? "USED" : "ACTIVE",
    },
  });

  const successResult = await respond("SUCCESS", "Access granted");

  await sendPushNotification({
    pushToken: accessCode.resident.pushToken,
    title: "Visitor Entry",
    body: `${accessCode.visitorName} has entered using their access code.`,
    data: { accessCodeId: accessCode.id },
  });

  return {
    ...successResult,
    visit: gate
      ? {
          visitorName: accessCode.visitorName,
          gate: { id: gate.id, name: gate.name },
          property: { id: gate.property.id, name: gate.property.name, address: gate.property.address },
        }
      : undefined,
  };
}
