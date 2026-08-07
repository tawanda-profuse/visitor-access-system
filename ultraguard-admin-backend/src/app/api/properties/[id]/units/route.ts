import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/properties/:id/units — Admin Portal: list units within a property.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAdmin(req);
    const units = await prisma.unit.findMany({
      where: { propertyId: params.id },
      include: { residents: { include: { resident: true } } },
      orderBy: { label: "asc" },
    });
    return ok({ units });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({ label: z.string().min(1) });

// POST /api/properties/:id/units — Admin Portal: add a unit/house to a property.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAdmin(req, ["SUPER_ADMIN", "OPERATOR"]);
    const body = createSchema.parse(await req.json());
    const unit = await prisma.unit.create({ data: { label: body.label, propertyId: params.id } });
    return ok({ unit }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}
