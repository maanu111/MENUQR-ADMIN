import { requireRestaurant } from "@/lib/auth/guards";
import { subscribe, type LiveEvent } from "@/lib/realtime";

export const dynamic = "force-dynamic";
/* Long-lived connection: it must not run on the edge or be buffered. */
export const runtime = "nodejs";

/* Serverless hosts cut a function off after a fixed time; this stream wants to
   stay open. 300s is the most Vercel Pro allows, and it is simply ignored on a
   normal server, where the stream runs until the browser closes it. The client
   reconnects on its own either way. */
export const maxDuration = 300;

/**
 * Server-sent events rather than websockets: this only ever pushes one way,
 * SSE reconnects on its own, and it needs no second process or custom server
 * to deploy — which matters because the app ships to a single VPS.
 */
export async function GET(request: Request) {
  const session = await requireRestaurant();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: LiveEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      /* Tell the browser we're up, and set its retry backoff. */
      controller.enqueue(encoder.encode("retry: 3000\n\n"));
      send({ type: "ping" });

      const unsubscribe = subscribe(session.restaurantId, send);

      /* Proxies drop idle connections; a comment every 25s keeps it warm. */
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
      /* nginx buffers SSE by default and would hold every event back. */
      "X-Accel-Buffering": "no",
    },
  });
}
