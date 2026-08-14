import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError, ApiError } from "@/lib/api-response";
import { generateOtp, hashOtp, otpExpiryDate, sendOtpSms } from "@/lib/otp";
import { normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";

const schema = z.object({
  phone: z.string().min(7).max(20),
});

// POST /api/auth/resident/request-otp
// Sends (or, if OTP_DEV_MODE=true, also echoes back) a one-time login code to a resident's
// phone number. Only residents that an admin has already added via the admin portal (and
// whose account is ACTIVE) may sign in — this never auto-creates an account.
export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const phone = normalizePhone(body.phone);

    const resident = await prisma.resident.findUnique({ where: { phone } });
    if (!resident || resident.status !== "ACTIVE") {
      throw new ApiError(
        "This phone number is not registered with Ultra-Guard. If you believe this is a mistake, please contact xrthemc@gmail.com.",
        403,
      );
    }

    const otp = generateOtp();
    await prisma.resident.update({
      where: { id: resident.id },
      data: { otpCodeHash: await hashOtp(otp), otpExpiresAt: otpExpiryDate() },
    });

    await sendOtpSms(phone, otp);

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
