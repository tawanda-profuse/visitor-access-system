import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError, ApiError } from "@/lib/api-response";
import { requireResident, verifyToken, getBearerToken } from "@/lib/auth";
import { parsePagination, buildPaginationMeta } from "@/lib/pagination";
import { publishEvent } from "@/lib/event-bus";

export const runtime = "nodejs";

// GET /api/panic — Admin portal: monitoring desk view of panic alerts (open first).
// Resident app: a resident's own alert history.
export async function GET(req: NextRequest) {
  try {
    const payload = verifyToken(getBearerToken(req));
    const where = payload.subjectType === "resident" ? { residentId: payload.residentId } : {};

    // Pagination only applies to the admin portal — the resident app has no pagination UI
    // and expects its own (naturally small) alert history back in full.
    const pagination = payload.subjectType !== "resident" ? parsePagination(req) : null;

    const [panicAlerts, total] = await Promise.all([
      prisma.panicAlert.findMany({
        where,
        include: { resident: true, property: true, resolvedBy: true },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        ...(pagination ? { skip: pagination.skip, take: pagination.take } : {}),
      }),
      prisma.panicAlert.count({ where }),
    ]);

    return ok({
      panicAlerts,
      ...(pagination ? { pagination: buildPaginationMeta(pagination.page, pagination.pageSize, total) } : {}),
    });
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
      include: { resident: true, property: true },
    });
    publishEvent("panic-alert", "created", panicAlert);

    // TODO: fan this out to guard-desk push tokens / SMS once the monitoring centre
    // notification channel is decided (see docs/HARDWARE_INTEGRATION_PROTOCOL.md).
    console.log(`[PANIC:PLACEHOLDER] Alert ${panicAlert.id} raised by resident ${residentId}`);

    return ok({ panicAlert }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}
