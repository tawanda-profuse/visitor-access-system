import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError, ApiError } from "@/lib/api-response";
import { hashPassword, signToken } from "@/lib/auth";
import { consumePasswordSetupToken } from "@/lib/tokens";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// POST /api/auth/admin/set-password — completes an invite or a forgot-password reset.
export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const { subjectType, subjectId } = await consumePasswordSetupToken(body.token);
    if (subjectType !== "ADMIN") {
      throw new ApiError("This link is invalid or has already been used", 400);
    }

    const admin = await prisma.admin.update({
      where: { id: subjectId },
      data: { passwordHash: await hashPassword(body.password) },
    });

    const token = signToken({
      subjectType: "admin",
      adminId: admin.id,
      role: admin.role,
      propertyId: admin.propertyId,
      onboarded: !!admin.onboardingCompletedAt,
    });

    return ok({
      token,
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
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}
