import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError, ApiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { buildAddress } from "@/lib/address";

export const runtime = "nodejs";

// GET /api/residents/:id — Admin: view a single resident profile.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAdmin(req);
    const resident = await prisma.resident.findUnique({
      where: { id: params.id },
      include: { units: { include: { unit: { include: { property: true } } } } },
    });
    if (!resident) throw new ApiError("Resident not found", 404);
    return ok({ resident });
  } catch (error) {
    return handleApiError(error);
  }
}

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(7).max(20).optional(),
  email: z.string().email().nullable().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "REMOVED"]).optional(),
  houseNumber: z.string().min(1).nullable().optional(),
  streetName: z.string().min(1).nullable().optional(),
  city: z.string().min(1).nullable().optional(),
  country: z.string().min(1).nullable().optional(),
});

// PATCH /api/residents/:id — Admin: edit profile / suspend / remove (soft delete via status).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAdmin(req, ["SUPER_ADMIN", "OPERATOR"]);
    const body = patchSchema.parse(await req.json());

    const addressFieldsTouched =
      body.houseNumber !== undefined ||
      body.streetName !== undefined ||
      body.city !== undefined ||
      body.country !== undefined;

    let data: typeof body & { address?: string | null } = body;
    if (addressFieldsTouched) {
      const existing = await prisma.resident.findUnique({ where: { id: params.id } });
      if (!existing) throw new ApiError("Resident not found", 404);
      data = {
        ...body,
        address: buildAddress({
          houseNumber: body.houseNumber !== undefined ? body.houseNumber : existing.houseNumber,
          streetName: body.streetName !== undefined ? body.streetName : existing.streetName,
          city: body.city !== undefined ? body.city : existing.city,
          country: body.country !== undefined ? body.country : existing.country,
        }),
      };
    }

    const resident = await prisma.resident.update({ where: { id: params.id }, data });
    return ok({ resident });
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}

// DELETE /api/residents/:id — Admin: permanently remove a resident record.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAdmin(req, ["SUPER_ADMIN"]);
    await prisma.resident.delete({ where: { id: params.id } });
    return ok({ message: "Resident removed" });
  } catch (error) {
    return handleApiError(error);
  }
}
