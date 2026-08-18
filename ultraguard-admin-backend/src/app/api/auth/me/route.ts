import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getBearerToken, verifyToken } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/auth/me — resolves the caller's identity from the bearer token.
// Used by both the mobile app (resident) and the admin portal (admin) to restore a session.
export async function GET(req: NextRequest) {
  try {
    const payload = verifyToken(getBearerToken(req));

    if (payload.subjectType === "resident") {
      const resident = await prisma.resident.findUnique({
        where: { id: payload.residentId },
        include: { units: { include: { unit: { include: { property: true } } } } },
      });
      if (!resident) throw new ApiError("Resident not found", 404);
      const { passwordHash: _passwordHash, ...residentSafe } = resident;
      return ok({ subjectType: "resident", resident: residentSafe });
    }

    const admin = await prisma.admin.findUnique({ where: { id: payload.adminId } });
    if (!admin) throw new ApiError("Admin not found", 404);
    if (admin.status === "SUSPENDED") {
      throw new ApiError("This account has been suspended. Contact your Ultra-Guard administrator.", 403);
    }
    return ok({
      subjectType: "admin",
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        propertyId: admin.propertyId,
        onboardingCompletedAt: admin.onboardingCompletedAt,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
