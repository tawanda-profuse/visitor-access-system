import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { createPasswordSetupToken } from "@/lib/tokens";
import { sendEmail } from "@/lib/email";
import { forgotPasswordEmail } from "@/lib/email-templates";

export const runtime = "nodejs";

const schema = z.object({ email: z.string().email() });

const GENERIC_MESSAGE = "If an account exists for that email, we've sent a link to reset your password.";

// POST /api/auth/admin/forgot-password — always returns a generic success message
// regardless of whether the email matched an account, to avoid account enumeration.
export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const admin = await prisma.admin.findUnique({ where: { email: body.email.toLowerCase() } });

    if (admin) {
      const rawToken = await createPasswordSetupToken("ADMIN", admin.id, "RESET");
      const link = `${process.env.BASE_URL}/set-password?token=${rawToken}&role=admin`;
      await sendEmail({ to: admin.email, ...(await forgotPasswordEmail(link)) });
    }

    return ok({ message: GENERIC_MESSAGE });
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}
