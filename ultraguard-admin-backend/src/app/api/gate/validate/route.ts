import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { verifyAccessAtGate, type GateWithProperty } from "@/lib/gate-verification";
import { publishEvent } from "@/lib/event-bus";

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

    let gate: GateWithProperty | null = null;
    const body = schema.parse(await req.json());

    if (body.gateId) {
      gate = await prisma.gate.findUnique({ where: { id: body.gateId }, include: { property: true } });
      if (!gate || !(await bcrypt.compare(apiKey, gate.apiKeyHash))) {
        throw new ApiError("Invalid gate credentials", 401);
      }
      const updatedGate = await prisma.gate.update({
        where: { id: gate.id },
        data: { status: "ONLINE", lastSeenAt: new Date() },
      });
      publishEvent("gate", "updated", updatedGate);
    } else if (apiKey !== (process.env.GATE_API_KEY ?? "dev-gate-shared-secret")) {
      // Dev fallback path — no Gate provisioned yet, just the shared secret from .env.
      throw new ApiError("Invalid gate credentials", 401);
    }

    const result = await verifyAccessAtGate({ gate, input: body.input, method: body.method, verifiedVia: "HARDWARE" });

    return ok({ result: result.entryLogResult, gateAction: result.gateAction, message: result.message });
  } catch (error) {
    return handleApiError(error);
  }
}
