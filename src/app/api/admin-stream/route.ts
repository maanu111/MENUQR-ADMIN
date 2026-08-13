import { requireSuperAdmin } from "@/lib/auth/guards";
import { subscribePlatform, type LiveEvent } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* Serverless hosts cut a function off after a fixed time; this stream wants to
   stay open. 300s is the most Vercel Pro allows, and it is simply ignored on a
   normal server, where the stream runs until the browser closes it. The client
   reconnects on its own either way. */
export const maxDuration = 300;

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
