import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError, ApiError } from "@/lib/api-response";
import { requirePropertyScopedAdmin } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/gates — Admin Portal: gate/intercom device inventory & connectivity status.
export async function GET(req: NextRequest) {
  try {
    const { propertyId } = await requirePropertyScopedAdmin(req);
    const gates = await prisma.gate.findMany({
      where: propertyId ? { propertyId } : undefined,
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
    const { propertyId } = await requirePropertyScopedAdmin(req, ["SUPER_ADMIN", "OPERATOR", "PROPERTY_ADMIN"]);
    const body = createSchema.parse(await req.json());

    // A Property Admin can only ever provision gates for their own property — ignore
    // any client-supplied propertyId rather than trusting it.
    if (propertyId && body.propertyId !== propertyId) {
      throw new ApiError("You can only add gates to your own property", 403);
    }

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
