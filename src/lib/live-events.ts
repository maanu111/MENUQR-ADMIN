/**
 * What the live stream sends. Shared by the server watcher and the client that
 * listens, so the two cannot drift — the watcher lives in a "server-only"
 * module the browser may not import, which is how they drifted before.
 */
export type LiveEvent =
  | {
      type: "order.new";
      code: string;
      table: string | null;
      /** DELIVERY tickets belong to the delivery screen, not the floor. */
      channel: string;
    }
  | { type: "order.stage"; code: string; stage: string }
  | { type: "call.new"; table: string; reason: string }
  | { type: "ticket.new"; subject: string; restaurant?: string }
  | { type: "ticket.reply"; subject: string; fromStaff: boolean; restaurant?: string }
  | { type: "ping" };
