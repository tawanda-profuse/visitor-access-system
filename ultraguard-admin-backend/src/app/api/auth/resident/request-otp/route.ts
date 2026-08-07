import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError, ApiError } from "@/lib/api-response";
import { generateOtp, hashOtp, otpExpiryDate, sendOtpSms } from "@/lib/otp";

export const runtime = "nodejs";

const schema = z.object({
  phone: z.string().min(7).max(20),
});

// POST /api/auth/resident/request-otp
// Sends (or, if OTP_DEV_MODE=true, also echoes back) a one-time login code to a resident's
// phone number. Auto-creates a minimal resident record on first sign-in; the admin portal
// is expected to fill in unit/property assignment afterwards.
export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());

    const resident = await prisma.resident.upsert({
      where: { phone: body.phone },
      update: {},
      create: { name: "New Resident", phone: body.phone },
    });

    if (resident.status !== "ACTIVE") {
      throw new ApiError("This resident account is not active. Contact your property manager.", 403);
    }

    const otp = generateOtp();
    await prisma.resident.update({
      where: { id: resident.id },
      data: { otpCodeHash: await hashOtp(otp), otpExpiresAt: otpExpiryDate() },
    });

    await sendOtpSms(body.phone, otp);

    const devMode = process.env.OTP_DEV_MODE === "true";
    return ok({
      message: "OTP sent",
      ...(devMode ? { devOtp: otp } : {}),
    });
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid phone number", 422, error.flatten());
    return handleApiError(error);
  }
}
