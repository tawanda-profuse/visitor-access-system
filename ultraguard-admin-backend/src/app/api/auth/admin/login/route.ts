import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError, ApiError } from "@/lib/api-response";
import { signToken, verifyPassword } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/admin/login — Security Company Management Portal login.
export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());

    const admin = await prisma.admin.findUnique({ where: { email: body.email } });
    if (!admin || !(await verifyPassword(body.password, admin.passwordHash))) {
      throw new ApiError("Invalid email or password", 401);
    }

    const token = signToken({ subjectType: "admin", adminId: admin.id, role: admin.role });

    return ok({
      token,
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}
