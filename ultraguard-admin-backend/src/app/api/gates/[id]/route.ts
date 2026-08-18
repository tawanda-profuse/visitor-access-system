import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError, ApiError } from "@/lib/api-response";
import { requirePropertyScopedAdmin } from "@/lib/auth";

export const runtime = "nodejs";

const patchSchema = z.object({ name: z.string().min(1) });

// PATCH /api/gates/:id — rename a gate. Property reassignment is intentionally not
// supported (for any role) to keep entry-log/property history unambiguous.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { propertyId } = await requirePropertyScopedAdmin(req, ["SUPER_ADMIN", "OPERATOR", "PROPERTY_ADMIN"]);
    const existing = await prisma.gate.findUnique({ where: { id: params.id } });
    if (!existing || (propertyId && existing.propertyId !== propertyId)) {
      throw new ApiError("Gate not found", 404);
    }

    const body = patchSchema.parse(await req.json());
    const gate = await prisma.gate.update({ where: { id: params.id }, data: { name: body.name } });
    const { apiKeyHash, ...gateSafe } = gate;
    return ok({ gate: gateSafe });
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}

// DELETE /api/gates/:id — remove a gate/intercom device. Entry logs referencing this
// gate are kept (their gateId is set to null), so history isn't lost.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { propertyId } = await requirePropertyScopedAdmin(req, ["SUPER_ADMIN", "OPERATOR", "PROPERTY_ADMIN"]);
    const existing = await prisma.gate.findUnique({ where: { id: params.id } });
    if (!existing || (propertyId && existing.propertyId !== propertyId)) {
      throw new ApiError("Gate not found", 404);
    }

    await prisma.gate.delete({ where: { id: params.id } });
    return ok({ message: "Gate removed" });
  } catch (error) {
    return handleApiError(error);
  }
}
