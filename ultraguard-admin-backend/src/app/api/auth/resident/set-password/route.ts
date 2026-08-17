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

// POST /api/auth/resident/set-password — completes an invite or a forgot-password
// reset (same endpoint handles both; the token's purpose doesn't change the flow).
export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const { subjectType, subjectId } = await consumePasswordSetupToken(body.token);
    if (subjectType !== "RESIDENT") {
      throw new ApiError("This link is invalid or has already been used", 400);
    }

    const resident = await prisma.resident.update({
      where: { id: subjectId },
      data: { passwordHash: await hashPassword(body.password), passwordSetAt: new Date() },
    });

    const token = signToken({ subjectType: "resident", residentId: resident.id });
    const { passwordHash: _passwordHash, ...residentSafe } = resident;

    return ok({ token, resident: residentSafe });
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}
