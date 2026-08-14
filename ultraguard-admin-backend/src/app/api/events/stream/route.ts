import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";
import { subscribeToEvents } from "@/lib/event-bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEEPALIVE_MS = 25_000;

// GET /api/events/stream — Server-Sent Events feed of live gate/panic/access activity for
// the admin portal (see src/lib/event-bus.ts). EventSource can't set an Authorization
// header, so the admin JWT travels as ?token= instead.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return new Response("Missing token", { status: 401 });

  try {
    const payload = verifyToken(token);
    if (payload.subjectType !== "admin") {
      return new Response("Forbidden", { status: 403 });
    }
  } catch {
    return new Response("Invalid or expired token", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // controller already closed (client disconnected) — cleanup below handles it
        }
      };

      send(": connected\n\n");

      const unsubscribe = subscribeToEvents((event) => {
        send(`data: ${JSON.stringify(event)}\n\n`);
      });

      const keepAlive = setInterval(() => send(": keep-alive\n\n"), KEEPALIVE_MS);

      const cleanup = () => {
        clearInterval(keepAlive);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
