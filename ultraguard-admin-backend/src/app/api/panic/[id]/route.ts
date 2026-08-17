import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError, ApiError } from "@/lib/api-response";
import { requirePropertyScopedAdmin } from "@/lib/auth";
import { publishEvent } from "@/lib/event-bus";

export const runtime = "nodejs";

const patchSchema = z.object({
  status: z.enum(["ACKNOWLEDGED", "RESOLVED"]),
});

// PATCH /api/panic/:id — Admin/guard desk: acknowledge or resolve an emergency alert.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { adminId, propertyId } = requirePropertyScopedAdmin(req);
    const body = patchSchema.parse(await req.json());

    const existing = await prisma.panicAlert.findUnique({ where: { id: params.id } });
    if (!existing || (propertyId && existing.propertyId !== propertyId)) {
      throw new ApiError("Panic alert not found", 404);
    }

    const panicAlert = await prisma.panicAlert.update({
      where: { id: params.id },
      data: {
        status: body.status,
        ...(body.status === "RESOLVED" ? { resolvedAt: new Date(), resolvedById: adminId } : {}),
      },
      include: { resident: true, property: true, resolvedBy: true },
    });
    publishEvent("panic-alert", "updated", panicAlert);

    return ok({ panicAlert });
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}
