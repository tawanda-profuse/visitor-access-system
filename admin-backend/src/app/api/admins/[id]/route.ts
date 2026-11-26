import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError, ApiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

const patchSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

// PATCH /api/admins/:id — Super Admin: suspend or reactivate a Property Admin/Operator
// account (e.g. non-payment/non-compliance). A Super Admin cannot suspend another
// Super Admin or themselves, to prevent accidental platform lockout.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { adminId } = await requireAdmin(req, ["SUPER_ADMIN"]);
    const body = patchSchema.parse(await req.json());

    const target = await prisma.admin.findUnique({ where: { id: params.id } });
    if (!target) throw new ApiError("Admin not found", 404);
    if (target.role === "SUPER_ADMIN" || target.id === adminId) {
      throw new ApiError("Cannot change the status of a Super Admin account", 403);
    }

    const admin = await prisma.admin.update({ where: { id: params.id }, data: { status: body.status } });
    const { passwordHash: _passwordHash, ...adminSafe } = admin;
    return ok({ admin: adminSafe });
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}

// DELETE /api/admins/:id — Super Admin: permanently remove a Property Admin/Operator account.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { adminId } = await requireAdmin(req, ["SUPER_ADMIN"]);

    const target = await prisma.admin.findUnique({ where: { id: params.id } });
    if (!target) throw new ApiError("Admin not found", 404);
    if (target.role === "SUPER_ADMIN" || target.id === adminId) {
      throw new ApiError("Cannot delete a Super Admin account", 403);
    }

    await prisma.admin.delete({ where: { id: params.id } });
    return ok({ message: "Admin removed" });
  } catch (error) {
    return handleApiError(error);
  }
}
