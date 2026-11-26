import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { normalizePhone } from "@/lib/phone";
import { createPasswordSetupToken } from "@/lib/tokens";
import { sendEmail } from "@/lib/email";
import { forgotPasswordEmail } from "@/lib/email-templates";
import { devLog } from "@/lib/dev-log";

export const runtime = "nodejs";

const schema = z.object({ identifier: z.string().min(1) });

const GENERIC_MESSAGE = "If an account exists for that phone or email, we've sent a link to reset your password.";

// POST /api/auth/resident/forgot-password — always returns a generic success message
// regardless of whether the identifier matched an account, to avoid account enumeration.
export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const identifier = body.identifier.trim();

    const resident = identifier.includes("@")
      ? await prisma.resident.findUnique({ where: { email: identifier.toLowerCase() } })
      : await (async () => {
          try {
            return await prisma.resident.findUnique({ where: { phone: normalizePhone(identifier) } });
          } catch {
            return null;
          }
        })();

    if (resident && resident.status === "ACTIVE" && resident.email) {
      const rawToken = await createPasswordSetupToken("RESIDENT", resident.id, "RESET");
      const link = `${process.env.BASE_URL}/set-password?token=${rawToken}&role=resident`;
      await sendEmail({ to: resident.email, ...(await forgotPasswordEmail(link, { includeApkDownload: true })) });
    } else if (resident) {
      devLog(`Forgot-password requested for resident ${resident.id} with no email on file — cannot send`);
    }

    return ok({ message: GENERIC_MESSAGE });
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}
