import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { requireResident } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  pushToken: z.string().min(1), // Expo push token from the mobile app
});

// POST /api/notifications/register-device
// Resident app calls this after obtaining an Expo push token so the backend can deliver
// "Real-Time Notifications" (visitor entered, panic alert acknowledged, etc). See
// src/lib/push.ts for the placeholder that will send through this token once a push
// provider is wired up.
export async function POST(req: NextRequest) {
  try {
    const { residentId } = requireResident(req);
    const body = schema.parse(await req.json());

    await prisma.resident.update({
      where: { id: residentId },
      data: { pushToken: body.pushToken },
    });

    return ok({ message: "Device registered for push notifications" });
  } catch (error) {
    if (error instanceof z.ZodError) return fail("Invalid request", 422, error.flatten());
    return handleApiError(error);
  }
}
