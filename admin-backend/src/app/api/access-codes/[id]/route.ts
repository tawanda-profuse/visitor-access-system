import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { verifyToken, getBearerToken, requirePropertyScopedAdmin } from "@/lib/auth";
import { publishEvent } from "@/lib/event-bus";

export const runtime = "nodejs";

async function loadOwnedAccessCode(id: string, payload: ReturnType<typeof verifyToken>, req: NextRequest) {
  const accessCode = await prisma.accessCode.findUnique({
    where: { id },
    include: { resident: { include: { units: { include: { unit: true } } } } },
  });
  if (!accessCode) throw new ApiError("Access code not found", 404);
  if (payload.subjectType === "resident" && accessCode.residentId !== payload.residentId) {
    throw new ApiError("Not authorized to view this access code", 403);
  }
  if (payload.subjectType === "admin") {
    const { propertyId } = await requirePropertyScopedAdmin(req);
    if (propertyId && !accessCode.resident.units.some((ru) => ru.unit.propertyId === propertyId)) {
      throw new ApiError("Access code not found", 404);
    }
  }
  return accessCode;
}

// GET /api/access-codes/:id — view a single invite's detail/status.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = verifyToken(getBearerToken(req));
    const accessCode = await loadOwnedAccessCode(params.id, payload, req);
    return ok({ accessCode });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/access-codes/:id { action: "revoke" } — resident revokes their own invite
// early, or admin revokes any invite (e.g. lost phone / security concern).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const payload = verifyToken(getBearerToken(req));
    const existing = await loadOwnedAccessCode(params.id, payload, req);

    if (existing.status !== "ACTIVE") {
      throw new ApiError(`Cannot revoke a code with status ${existing.status}`, 400);
    }

    const accessCode = await prisma.accessCode.update({
      where: { id: params.id },
      data: { status: "REVOKED" },
      include: { resident: true },
    });
    publishEvent("access-code", "updated", accessCode);

    return ok({ accessCode });
  } catch (error) {
    return handleApiError(error);
  }
}
