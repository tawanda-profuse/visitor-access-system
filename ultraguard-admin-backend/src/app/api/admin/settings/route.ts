import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { getSupportEmail, setSupportEmail } from "@/lib/settings";

export const runtime = "nodejs";

// GET /api/admin/settings — system-wide settings (currently just the support contact
// email shown to residents who are denied mobile app access).
export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);
    const supportEmail = await getSupportEmail();
    return ok({ supportEmail });
  } catch (error) {
    return handleApiError(error);
  }
}

const patchSchema = z.object({
  supportEmail: z.string().email(),
});

// PATCH /api/admin/settings — Admin Portal: Profile Settings page, "Support Email".
// Only the Super Admin may change this.
export async function PATCH(req: NextRequest) {
  try {
    requireAdmin(req, ["SUPER_ADMIN"]);
    const body = patchSchema.parse(await req.json());
    const supportEmail = await setSupportEmail(body.supportEmail);
    return ok({ supportEmail });
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}
