import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError, ApiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/admin/onboarding — resume state for the Property Admin onboarding wizard.
export async function GET(req: NextRequest) {
  try {
    const auth = requireAdmin(req, ["PROPERTY_ADMIN"]);
    const admin = await prisma.admin.findUnique({
      where: { id: auth.adminId },
      include: { property: { include: { gates: true } } },
    });
    if (!admin) throw new ApiError("Admin not found", 404);

    return ok({
      name: admin.name,
      onboardingCompletedAt: admin.onboardingCompletedAt,
      property: admin.property,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const gateSchema = z.object({ id: z.string().optional(), name: z.string().min(1) });
const putSchema = z.object({
  propertyName: z.string().min(1),
  propertyAddress: z.string().min(1),
  gates: z.array(gateSchema).min(1),
  adminName: z.string().min(1).optional(),
});

// PUT /api/admin/onboarding — create/update the wizard's draft state (property + gates +
// display name). Idempotent: safe to call repeatedly before POST .../complete.
export async function PUT(req: NextRequest) {
  try {
    const auth = requireAdmin(req, ["PROPERTY_ADMIN"]);
    if (auth.onboarded) throw new ApiError("Onboarding already completed", 409);

    const body = putSchema.parse(await req.json());
    const admin = await prisma.admin.findUnique({ where: { id: auth.adminId } });
    if (!admin) throw new ApiError("Admin not found", 404);

    let propertyId = admin.propertyId;
    if (propertyId) {
      await prisma.property.update({
        where: { id: propertyId },
        data: { name: body.propertyName, address: body.propertyAddress },
      });
    } else {
      const property = await prisma.property.create({
        data: { name: body.propertyName, address: body.propertyAddress },
      });
      propertyId = property.id;
      await prisma.admin.update({ where: { id: admin.id }, data: { propertyId } });
    }

    const existingGates = await prisma.gate.findMany({ where: { propertyId } });
    const incomingIds = new Set(body.gates.filter((g) => g.id).map((g) => g.id!));
    const toDeleteIds = existingGates.filter((g) => !incomingIds.has(g.id)).map((g) => g.id);
    if (toDeleteIds.length) {
      await prisma.gate.deleteMany({ where: { id: { in: toDeleteIds } } });
    }

    const newlyCreatedGates: { name: string; apiKey: string }[] = [];
    for (const g of body.gates) {
      if (g.id) {
        await prisma.gate.update({ where: { id: g.id }, data: { name: g.name } });
      } else {
        const apiKey = nanoid(32);
        const gate = await prisma.gate.create({
          data: { name: g.name, propertyId, apiKeyHash: await bcrypt.hash(apiKey, 10) },
        });
        newlyCreatedGates.push({ name: gate.name, apiKey });
      }
    }

    if (body.adminName) {
      await prisma.admin.update({ where: { id: admin.id }, data: { name: body.adminName } });
    }

    const property = await prisma.property.findUnique({ where: { id: propertyId }, include: { gates: true } });

    return ok({ property, newlyCreatedGates });
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}
