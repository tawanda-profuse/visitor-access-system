import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { requireAdmin, signToken } from "@/lib/auth";

export const runtime = "nodejs";

// POST /api/admin/onboarding/complete — finalizes the wizard, re-issues a JWT carrying
// the now-set propertyId/onboarded flag so the portal doesn't need to force a re-login.
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req, ["PROPERTY_ADMIN"]);
    if (auth.onboarded) throw new ApiError("Onboarding already completed", 409);

    const admin = await prisma.admin.findUnique({ where: { id: auth.adminId } });
    if (!admin) throw new ApiError("Admin not found", 404);
    if (!admin.propertyId) {
      throw new ApiError("Please complete the property and gate setup first", 400);
    }

    const gateCount = await prisma.gate.count({ where: { propertyId: admin.propertyId } });
    if (gateCount < 1) {
      throw new ApiError("Add at least one gate before completing setup", 400);
    }

    const updated = await prisma.admin.update({
      where: { id: admin.id },
      data: { onboardingCompletedAt: new Date() },
    });

    const token = signToken({
      subjectType: "admin",
      adminId: updated.id,
      role: updated.role,
      propertyId: updated.propertyId,
      onboarded: true,
    });

    return ok({
      token,
      admin: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        propertyId: updated.propertyId,
        onboardingCompletedAt: updated.onboardingCompletedAt,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
