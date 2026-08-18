import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";
import { createPasswordSetupToken } from "@/lib/tokens";
import { sendEmail } from "@/lib/email";
import { propertyAdminInviteEmail } from "@/lib/email-templates";

export const runtime = "nodejs";

// GET /api/admins — Super Admin: list all admin accounts (property admins + operators).
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req, ["SUPER_ADMIN"]);
    const admins = await prisma.admin.findMany({
      include: { property: true },
      orderBy: { createdAt: "desc" },
    });
    return ok({ admins: admins.map(({ passwordHash, ...admin }) => admin) });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["PROPERTY_ADMIN", "OPERATOR"]).default("PROPERTY_ADMIN"),
});

// POST /api/admins — Super Admin: invite a Property Admin (or Operator). No password is
// set here — an invite email with a set-password link is sent immediately.
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req, ["SUPER_ADMIN"]);
    const body = createSchema.parse(await req.json());

    const admin = await prisma.admin.create({
      data: { name: body.name, email: body.email.toLowerCase(), role: body.role },
    });

    const rawToken = await createPasswordSetupToken("ADMIN", admin.id, "INVITE");
    const link = `${process.env.BASE_URL}/set-password?token=${rawToken}&role=admin`;
    await sendEmail({ to: admin.email, ...(await propertyAdminInviteEmail(link)) });

    const { passwordHash, ...adminSafe } = admin;
    return ok({ admin: adminSafe }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}
