import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError, ApiError } from "@/lib/api-response";
import { requirePropertyScopedAdmin } from "@/lib/auth";

export const runtime = "nodejs";

const createSchema = z.object({
  residentId: z.string().min(1),
  unitId: z.string().min(1),
});

// POST /api/properties/:id/residents — assigns an EXISTING standalone resident (no prior
// unit assignment) to a unit within this property. This is the "Manage Residents" ->
// "Add Resident" action on the Properties page — it picks from already-created,
// currently-unassigned residents (see GET /api/residents?unassigned=true), it does not
// create a new resident. A resident already linked to any property must be removed from
// it first (DELETE .../residents/:residentId) before being added elsewhere.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { role, propertyId } = await requirePropertyScopedAdmin(req);
    if (propertyId && propertyId !== params.id) {
      throw new ApiError("Property not found", 404);
    }

    const body = createSchema.parse(await req.json());

    const unit = await prisma.unit.findUnique({ where: { id: body.unitId } });
    if (!unit || unit.propertyId !== params.id) {
      throw new ApiError("Unit not found in this property", 404);
    }

    const resident = await prisma.resident.findUnique({
      where: { id: body.residentId },
      include: { units: true },
    });
    if (!resident) throw new ApiError("Resident not found", 404);
    if (resident.units.length > 0) {
      throw new ApiError("This resident is already assigned to a property — remove them from it first", 409);
    }
    // A Property Admin may only reclaim a resident that was previously theirs (created
    // for, or last assigned within, this same property) — never an arbitrary standalone
    // resident, even if they somehow know its id. Only the Super Admin is unrestricted.
    if (role === "PROPERTY_ADMIN" && resident.lastPropertyId !== params.id) {
      throw new ApiError("This resident is not associated with your property", 403);
    }

    const updated = await prisma.resident.update({
      where: { id: body.residentId },
      data: {
        lastPropertyId: params.id,
        units: { create: { unitId: body.unitId, isPrimary: true } },
      },
      include: { units: { include: { unit: true } } },
    });

    return ok({ resident: updated }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}
