import bcrypt from "bcryptjs";

const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES ?? 5);

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function hashOtp(otp: string) {
  return bcrypt.hash(otp, 10);
}

export async function verifyOtp(otp: string, hash: string) {
  return bcrypt.compare(otp, hash);
}

export function otpExpiryDate(): Date {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
}

/**
 * Placeholder SMS/WhatsApp dispatch. No SMS provider (Twilio, WhatsApp Business API, etc.)
 * has been contracted yet — see docs/HARDWARE_INTEGRATION_PROTOCOL.md and the SRS Phase 2
 * scope note. This currently just logs; swap the body for a real provider call when one
 * is selected, and remove the OTP_DEV_MODE echo-back in the auth route once it does.
 */
export async function sendOtpSms(phone: string, otp: string): Promise<void> {
  console.log(`[OTP:PLACEHOLDER] Would send OTP ${otp} to ${phone} via SMS/WhatsApp provider.`);
}
