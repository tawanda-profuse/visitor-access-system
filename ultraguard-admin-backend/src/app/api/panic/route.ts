import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError, ApiError } from "@/lib/api-response";
import { requireResident, verifyToken, getBearerToken } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/panic — Admin portal: monitoring desk view of panic alerts (open first).
// Resident app: a resident's own alert history.
export async function GET(req: NextRequest) {
  try {
    const payload = verifyToken(getBearerToken(req));
    const where = payload.subjectType === "resident" ? { residentId: payload.residentId } : {};

    const panicAlerts = await prisma.panicAlert.findMany({
      where,
      include: { resident: true, property: true, resolvedBy: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    return ok({ panicAlerts });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  propertyId: z.string().optional(),
  message: z.string().max(500).optional(),
});

// POST /api/panic — Resident app: Emergency / Panic Trigger.
// Sends an instant alert to the security guard desk / monitoring centre (admin portal
// surfaces this via the Live Gate Activity Monitor / a dedicated alerts feed).
export async function POST(req: NextRequest) {
  try {
    const { residentId } = requireResident(req);
    const body = createSchema.parse(await req.json());

    const panicAlert = await prisma.panicAlert.create({
      data: { residentId, propertyId: body.propertyId, message: body.message },
    });

    // TODO: fan this out to guard-desk push tokens / SMS once the monitoring centre
    // notification channel is decided (see docs/HARDWARE_INTEGRATION_PROTOCOL.md).
    console.log(`[PANIC:PLACEHOLDER] Alert ${panicAlert.id} raised by resident ${residentId}`);

    return ok({ panicAlert }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}
