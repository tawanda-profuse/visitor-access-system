import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError, ApiError } from "@/lib/api-response";
import { requireAdmin, hashPassword, verifyPassword } from "@/lib/auth";

export const runtime = "nodejs";

const patchSchema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8).optional(),
  })
  .refine((data) => !data.newPassword || !!data.currentPassword, {
    message: "currentPassword is required to set a new password",
    path: ["currentPassword"],
  });

// PATCH /api/admin/profile — Admin self-service: update own name/email and/or password.
// Always operates on the caller's own account (adminId from the token) — there is no path
// param, so an admin can never use this to edit someone else's profile.
export async function PATCH(req: NextRequest) {
  try {
    const { adminId } = await requireAdmin(req);
    const body = patchSchema.parse(await req.json());

    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) throw new ApiError("Admin not found", 404);

    let passwordHash: string | undefined;
    if (body.newPassword) {
      if (!admin.passwordHash) {
        throw new ApiError("Please set your password via the link in your invite email first", 400);
      }
      const currentMatches = await verifyPassword(body.currentPassword!, admin.passwordHash);
      if (!currentMatches) throw new ApiError("Current password is incorrect", 401);
      passwordHash = await hashPassword(body.newPassword);
    }

    const updated = await prisma.admin.update({
      where: { id: adminId },
      data: {
        name: body.name,
        email: body.email,
        ...(passwordHash ? { passwordHash } : {}),
      },
    });

    return ok({
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
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}
