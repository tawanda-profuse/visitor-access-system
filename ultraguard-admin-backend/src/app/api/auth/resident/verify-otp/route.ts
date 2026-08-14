import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError, ApiError } from "@/lib/api-response";
import { verifyOtp } from "@/lib/otp";
import { signToken } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";

const schema = z.object({
  phone: z.string().min(7).max(20),
  otp: z.string().length(6),
});

// POST /api/auth/resident/verify-otp
// Verifies the OTP sent via request-otp and issues a JWT for the resident mobile app.
export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const phone = normalizePhone(body.phone);

    const resident = await prisma.resident.findUnique({ where: { phone } });
    if (!resident || !resident.otpCodeHash || !resident.otpExpiresAt) {
      throw new ApiError("No OTP request found for this phone number", 400);
    }
    if (resident.otpExpiresAt < new Date()) {
      throw new ApiError("OTP has expired, please request a new one", 400);
    }
    const matches = await verifyOtp(body.otp, resident.otpCodeHash);
    if (!matches) {
      throw new ApiError("Incorrect OTP", 401);
    }

    await prisma.resident.update({
      where: { id: resident.id },
      data: { otpCodeHash: null, otpExpiresAt: null },
    });

    const token = signToken({ subjectType: "resident", residentId: resident.id });

    return ok({
      token,
      resident: {
        id: resident.id,
        name: resident.name,
        phone: resident.phone,
        email: resident.email,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}
