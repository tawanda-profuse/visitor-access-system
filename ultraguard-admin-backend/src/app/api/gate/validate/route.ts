import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError, ApiError } from "@/lib/api-response";
import { isAccessCodeCurrentlyValid } from "@/lib/access-codes";
import { sendPushNotification } from "@/lib/push";

export const runtime = "nodejs";

/**
 * POST /api/gate/validate
 *
 * *** Hardware integration placeholder ***
 * This is the contract intercom/gate hardware calls once it is selected — see
 * docs/HARDWARE_INTEGRATION_PROTOCOL.md for the full spec, auth scheme, and response
 * codes a device integrator should implement against. No physical relay signalling
 * happens here; `data.gateAction` tells the (future) hardware bridge what to do.
 *
 * Auth: `x-gate-api-key` header, checked against the Gate's hashed shared secret.
 * Until real devices exist, GATE_API_KEY in .env is a single dev-wide fallback secret
 * so this can be exercised with curl/Postman without provisioning a Gate row.
 */
const schema = z.object({
  gateId: z.string().optional(),
  input: z.string().min(4), // the 6-digit PIN, or the scanned QR token
  method: z.enum(["PIN", "QR"]),
});

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-gate-api-key");
    if (!apiKey) throw new ApiError("Missing x-gate-api-key header", 401);

    let gate = null as Awaited<ReturnType<typeof prisma.gate.findUnique>> | null;
    const body = schema.parse(await req.json());

    if (body.gateId) {
      gate = await prisma.gate.findUnique({ where: { id: body.gateId } });
      if (!gate || !(await bcrypt.compare(apiKey, gate.apiKeyHash))) {
        throw new ApiError("Invalid gate credentials", 401);
      }
      await prisma.gate.update({
        where: { id: gate.id },
        data: { status: "ONLINE", lastSeenAt: new Date() },
      });
    } else if (apiKey !== (process.env.GATE_API_KEY ?? "dev-gate-shared-secret")) {
      // Dev fallback path — no Gate provisioned yet, just the shared secret from .env.
      throw new ApiError("Invalid gate credentials", 401);
    }

    const accessCode = await prisma.accessCode.findFirst({
      where: body.method === "PIN" ? { code: body.input } : { qrToken: body.input },
      include: { resident: true },
    });

    const logBase = {
      gateId: gate?.id,
      method: body.method,
      visitorName: accessCode?.visitorName,
      accessCodeId: accessCode?.id,
      residentId: accessCode?.residentId,
    };

    if (!accessCode) {
      await prisma.entryLog.create({
        data: { ...logBase, result: "INVALID", reason: "Code not recognized" },
      });
      return ok({ result: "INVALID", gateAction: "DENY", message: "Code not recognized" }, 200);
    }

    if (accessCode.status === "REVOKED") {
      await prisma.entryLog.create({
        data: { ...logBase, result: "DENIED", reason: "Code was revoked" },
      });
      return ok({ result: "DENIED", gateAction: "DENY", message: "Code was revoked" });
    }

    if (accessCode.status === "USED" && accessCode.type !== "RECURRING") {
      await prisma.entryLog.create({
        data: { ...logBase, result: "DENIED", reason: "Code already used" },
      });
      return ok({ result: "DENIED", gateAction: "DENY", message: "Code already used" });
    }

    const validity = isAccessCodeCurrentlyValid(accessCode);
    if (!validity.valid) {
      const expired = new Date() > accessCode.validUntil;
      if (expired && accessCode.status === "ACTIVE") {
        await prisma.accessCode.update({ where: { id: accessCode.id }, data: { status: "EXPIRED" } });
      }
      await prisma.entryLog.create({
        data: { ...logBase, result: expired ? "EXPIRED" : "DENIED", reason: validity.reason },
      });
      return ok({
        result: expired ? "EXPIRED" : "DENIED",
        gateAction: "DENY",
        message: validity.reason,
      });
    }

    if (accessCode.useCount >= accessCode.maxUses) {
      await prisma.entryLog.create({
        data: { ...logBase, result: "DENIED", reason: "Maximum uses reached" },
      });
      return ok({ result: "DENIED", gateAction: "DENY", message: "Maximum uses reached" });
    }

    const newUseCount = accessCode.useCount + 1;
    await prisma.accessCode.update({
      where: { id: accessCode.id },
      data: {
        useCount: newUseCount,
        status: accessCode.type === "ONE_TIME" || newUseCount >= accessCode.maxUses ? "USED" : "ACTIVE",
      },
    });

    await prisma.entryLog.create({ data: { ...logBase, result: "SUCCESS" } });

    await sendPushNotification({
      pushToken: accessCode.resident.pushToken,
      title: "Visitor Entry",
      body: `${accessCode.visitorName} has entered using their access code.`,
      data: { accessCodeId: accessCode.id },
    });

    return ok({ result: "SUCCESS", gateAction: "OPEN", message: "Access granted" });
  } catch (error) {
    return handleApiError(error);
  }
}
