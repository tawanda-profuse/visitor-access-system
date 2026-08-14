import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError, ApiError } from "@/lib/api-response";
import { publishEvent } from "@/lib/event-bus";

export const runtime = "nodejs";

const schema = z.object({
  gateId: z.string(),
  bufferedCodesCount: z.number().int().min(0).optional(),
});

/**
 * POST /api/gate/heartbeat
 *
 * *** Hardware integration placeholder ***
 * Lets gate hardware report liveness and, if it implements the SRS "Offline Buffer Mode"
 * requirement, how many codes it currently has cached for offline validation. Drives the
 * admin portal's "Live Gate Activity Monitor" connectivity indicator.
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-gate-api-key");
    if (!apiKey) throw new ApiError("Missing x-gate-api-key header", 401);

    const body = schema.parse(await req.json());
    const gate = await prisma.gate.findUnique({ where: { id: body.gateId } });
    if (!gate || !(await bcrypt.compare(apiKey, gate.apiKeyHash))) {
      throw new ApiError("Invalid gate credentials", 401);
    }

    const updatedGate = await prisma.gate.update({
      where: { id: gate.id },
      data: { status: "ONLINE", lastSeenAt: new Date() },
    });
    publishEvent("gate", "updated", updatedGate);

    return ok({ message: "Heartbeat received", bufferedCodesCount: body.bufferedCodesCount ?? null });
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}
