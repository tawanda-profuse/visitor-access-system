import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, handleApiError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/admin/dashboard/summary — headline counts for the admin portal landing page.
export async function GET(req: NextRequest) {
  try {
    requireAdmin(req);

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

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
      prisma.resident.count({ where: { status: "ACTIVE" } }),
      prisma.property.count(),
      prisma.gate.count({ where: { status: "ONLINE" } }),
      prisma.gate.count(),
      prisma.entryLog.count({ where: { occurredAt: { gte: since24h } } }),
      prisma.panicAlert.count({ where: { status: "OPEN" } }),
      prisma.accessCode.count({ where: { status: "ACTIVE" } }),
      prisma.entryLog.findMany({
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
