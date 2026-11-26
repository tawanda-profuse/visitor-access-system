import { ok } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return ok({ status: "ok", service: "admin-backend", timestamp: new Date().toISOString() });
}
