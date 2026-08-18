import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { requirePropertyScopedAdmin } from "@/lib/auth";

export const runtime = "nodejs";

// DELETE /api/properties/:id/residents/:residentId — unassigns a resident from every
// unit within this property (does NOT delete the resident record — they simply become
// unlinked from this property, matching how a standalone resident already behaves).
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; residentId: string } },
) {
  try {
    const { propertyId } = await requirePropertyScopedAdmin(req);
    if (propertyId && propertyId !== params.id) {
      throw new ApiError("Property not found", 404);
    }

    const { count } = await prisma.residentUnit.deleteMany({
      where: { residentId: params.residentId, unit: { propertyId: params.id } },
    });
    if (count === 0) {
      throw new ApiError("Resident is not assigned to this property", 404);
    }

    return ok({ message: "Resident removed from property" });
  } catch (error) {
    return handleApiError(error);
  }
}
