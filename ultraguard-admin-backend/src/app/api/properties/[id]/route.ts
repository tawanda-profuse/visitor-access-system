import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError, ApiError } from "@/lib/api-response";
import { requirePropertyScopedAdmin } from "@/lib/auth";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
});

// PATCH /api/properties/:id — Super Admin: edit any property. Property Admin: only
// their own (enforced, not just hidden client-side).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { propertyId } = await requirePropertyScopedAdmin(req);
    if (propertyId && propertyId !== params.id) {
      throw new ApiError("Property not found", 404);
    }

    const body = patchSchema.parse(await req.json());
    const property = await prisma.property.update({ where: { id: params.id }, data: body });
    return ok({ property });
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}
