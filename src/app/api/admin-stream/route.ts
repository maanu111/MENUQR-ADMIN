import { requireSuperAdmin } from "@/lib/auth/guards";
import { subscribePlatform, type LiveEvent } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The platform's own live feed: support questions from every restaurant. */
export async function GET(request: Request) {
  await requireSuperAdmin();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: LiveEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      controller.enqueue(encoder.encode("retry: 3000\n\n"));
      send({ type: "ping" });

      const unsubscribe = subscribePlatform(send);

      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          /* Closed underneath us; the abort handler tidies up. */
        }
      }, 25000);

      request.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* Already closed. */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
