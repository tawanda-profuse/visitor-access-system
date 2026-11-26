import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { requireAdmin, requirePropertyScopedAdmin } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/properties — Admin Portal: list managed properties. Property Admins only
// ever see their own property (scoped by the API, not just hidden client-side).
export async function GET(req: NextRequest) {
  try {
    const { propertyId } = await requirePropertyScopedAdmin(req);
    const properties = await prisma.property.findMany({
      where: propertyId ? { id: propertyId } : undefined,
      include: {
        units: { include: { residents: { include: { resident: true } } } },
        gates: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return ok({ properties });
  } catch (error) {
    return handleApiError(error);
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
});

// POST /api/properties — Admin Portal: onboard a new managed property/estate.
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req, ["SUPER_ADMIN", "OPERATOR"]);
    const body = createSchema.parse(await req.json());
    const property = await prisma.property.create({ data: body });
    return ok({ property }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}
