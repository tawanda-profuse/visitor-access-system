import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/gates — Admin Portal: gate/intercom device inventory & connectivity status.
export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const gates = await prisma.gate.findMany({
      include: { property: true },
      orderBy: { createdAt: "desc" },
    });
    return ok({ gates: gates.map(({ apiKeyHash, ...gate }) => gate) });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  propertyId: z.string().min(1),
});

/**
 * POST /api/gates
 *
 * *** Hardware integration placeholder ***
 * Provisions a Gate record and returns a one-time-shown API key. Since no intercom
 * hardware model has been selected yet (see SRS §3.2 and docs/HARDWARE_INTEGRATION_PROTOCOL.md),
 * this key is what a future device/bridge would use as `x-gate-api-key` against
 * /api/gate/validate and /api/gate/heartbeat.
 */
export async function POST(req: NextRequest) {
  try {
    requireAdmin(req, ["SUPER_ADMIN", "OPERATOR"]);
    const body = createSchema.parse(await req.json());

    const apiKey = nanoid(32);
    const gate = await prisma.gate.create({
      data: { name: body.name, propertyId: body.propertyId, apiKeyHash: await bcrypt.hash(apiKey, 10) },
    });

    return ok({ gate: { ...gate, apiKeyHash: undefined }, apiKey }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}
