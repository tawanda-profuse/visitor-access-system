import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, handleApiError } from "@/lib/api-response";
import { requirePropertyScopedAdmin } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/admin/dashboard/summary — headline counts for the admin portal landing page.
// Property Admins only see counts/activity relevant to their own property.
export async function GET(req: NextRequest) {
  try {
    const { propertyId } = requirePropertyScopedAdmin(req);

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const residentScope = propertyId ? { units: { some: { unit: { propertyId } } } } : {};
    const gateScope = propertyId ? { propertyId } : {};
    const entryLogScope = propertyId ? { gate: { propertyId } } : {};
    const panicScope = propertyId ? { propertyId } : {};
    const accessCodeScope = propertyId ? { resident: { units: { some: { unit: { propertyId } } } } } : {};

    const [
      residentCount,
      propertyCount,
      gatesOnline,
      gatesTotal,
      entriesLast24h,
      openPanicAlerts,
      activeAccessCodes,
      recentEntryLogs,
    ] = await Promise.all([
      prisma.resident.count({ where: { status: "ACTIVE", ...residentScope } }),
      propertyId ? Promise.resolve(1) : prisma.property.count(),
      prisma.gate.count({ where: { status: "ONLINE", ...gateScope } }),
      prisma.gate.count({ where: gateScope }),
      prisma.entryLog.count({ where: { occurredAt: { gte: since24h }, ...entryLogScope } }),
      prisma.panicAlert.count({ where: { status: "OPEN", ...panicScope } }),
      prisma.accessCode.count({ where: { status: "ACTIVE", ...accessCodeScope } }),
      prisma.entryLog.findMany({
        where: entryLogScope,
        orderBy: { occurredAt: "desc" },
        take: 10,
        include: { gate: true, resident: true },
      }),
    ]);

    return ok({
      residentCount,
      propertyCount,
      gatesOnline,
      gatesTotal,
      entriesLast24h,
      openPanicAlerts,
      activeAccessCodes,
      recentEntryLogs,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
