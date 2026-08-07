import { ok } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET() {
  return ok({ status: "ok", service: "ultraguard-admin-backend", timestamp: new Date().toISOString() });
}
