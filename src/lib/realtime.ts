import "server-only";
import { db } from "./db";
import type { LiveEvent } from "./live-events";

export type { LiveEvent } from "./live-events";

type Subscriber = (event: LiveEvent) => void;

/**
 * One watcher per audience, shared by everyone looking at it.
 *
 * The guest app is a separate process writing to the same MySQL, so an
 * in-memory pub/sub alone would never hear a QR order. Instead each watcher
 * polls a few small queries and diffs them — a fixed cost per audience no
 * matter how many screens are open, working across processes and restarts
 * without a broker to run.
 */
const TICK_MS = 1500;

type Watch = {
  subscribers: Set<Subscriber>;
  timer: ReturnType<typeof setInterval> | null;
  lastOrderAt: Date;
  lastCallAt: Date;
  lastTicketAt: Date;
  lastMessageAt: Date;
  /** Stage per order id, so a ticket moving is noticed as well as arriving. */
  stages: Map<string, string>;
};

const restaurantWatches = new Map<string, Watch>();
let platformWatch: Watch | null = null;

function freshWatch(): Watch {
  const now = new Date();
  return {
    subscribers: new Set(),
    timer: null,
    lastOrderAt: now,
    lastCallAt: now,
    lastTicketAt: now,
    lastMessageAt: now,
    stages: new Map(),
  };
}

function emit(watch: Watch, event: LiveEvent) {
  for (const send of watch.subscribers) {
    try {
      send(event);
    } catch {
      /* A broken pipe is cleaned up when its stream closes. */
    }
  }
}

async function tickRestaurant(restaurantId: string, watch: Watch) {
  try {
    const [orders, calls, replies] = await Promise.all([
      db.order.findMany({
        where: {
          restaurantId,
          OR: [
            { placedAt: { gt: watch.lastOrderAt } },
            { stage: { in: ["PLACED", "ACCEPTED", "PREPARING", "READY"] } },
          ],
        },
        select: {
          id: true,
          code: true,
          stage: true,
          channel: true,
          placedAt: true,
          table: { select: { number: true } },
        },
        orderBy: { placedAt: "asc" },
        take: 60,
      }),
      db.waiterCall.findMany({
        where: {
          restaurantId,
          acknowledgedAt: null,
          createdAt: { gt: watch.lastCallAt },
        },
        select: {
          createdAt: true,
          reason: true,
          table: { select: { number: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 20,
      }),
      /* Support replies from the platform, so the restaurant sees an answer
         arrive without sitting on the page refreshing. */
      db.supportMessage.findMany({
        where: {
          fromStaff: true,
          createdAt: { gt: watch.lastMessageAt },
          ticket: { restaurantId },
        },
        select: { createdAt: true, ticket: { select: { subject: true } } },
        orderBy: { createdAt: "asc" },
        take: 10,
      }),
    ]);

    for (const order of orders) {
      if (order.placedAt > watch.lastOrderAt) {
        watch.lastOrderAt = order.placedAt;
        watch.stages.set(order.id, order.stage);
        emit(watch, {
          type: "order.new",
          code: order.code,
          table: order.table?.number ?? null,
          channel: order.channel,
        });
        continue;
      }
      const known = watch.stages.get(order.id);
      if (known && known !== order.stage) {
        emit(watch, { type: "order.stage", code: order.code, stage: order.stage });
      }
      watch.stages.set(order.id, order.stage);
    }

    for (const call of calls) {
      watch.lastCallAt = call.createdAt;
      emit(watch, {
        type: "call.new",
        table: call.table.number,
        reason: call.reason,
      });
    }

    for (const reply of replies) {
      watch.lastMessageAt = reply.createdAt;
      emit(watch, {
        type: "ticket.reply",
        subject: reply.ticket.subject,
        fromStaff: true,
      });
    }
  } catch {
    /* A dropped tick is harmless — the next re-reads from the same marks. */
  }
}

async function tickPlatform(watch: Watch) {
  try {
    const [tickets, replies] = await Promise.all([
      db.supportTicket.findMany({
        where: { createdAt: { gt: watch.lastTicketAt } },
        select: {
          createdAt: true,
          subject: true,
          restaurant: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 20,
      }),
      db.supportMessage.findMany({
        where: { fromStaff: false, createdAt: { gt: watch.lastMessageAt } },
        select: {
          createdAt: true,
          ticket: {
            select: { subject: true, restaurant: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: "asc" },
        take: 20,
      }),
    ]);

    for (const ticket of tickets) {
      watch.lastTicketAt = ticket.createdAt;
      emit(watch, {
        type: "ticket.new",
        subject: ticket.subject,
        restaurant: ticket.restaurant.name,
      });
    }

    for (const reply of replies) {
      watch.lastMessageAt = reply.createdAt;
      emit(watch, {
        type: "ticket.reply",
        subject: reply.ticket.subject,
        fromStaff: false,
        restaurant: reply.ticket.restaurant.name,
      });
    }
  } catch {
    /* Same. */
  }
}

/** Subscribes one restaurant screen. */
export function subscribe(restaurantId: string, send: Subscriber) {
  let watch = restaurantWatches.get(restaurantId);
  if (!watch) {
    watch = freshWatch();
    restaurantWatches.set(restaurantId, watch);
  }

  watch.subscribers.add(send);

  if (!watch.timer) {
    const current = watch;
    current.timer = setInterval(
      () => void tickRestaurant(restaurantId, current),
      TICK_MS,
    );
  }

  return () => {
    const current = restaurantWatches.get(restaurantId);
    if (!current) return;
    current.subscribers.delete(send);
    if (current.subscribers.size === 0) {
      if (current.timer) clearInterval(current.timer);
      restaurantWatches.delete(restaurantId);
    }
  };
}

/** Subscribes one super admin screen — support across every restaurant. */
export function subscribePlatform(send: Subscriber) {
  if (!platformWatch) platformWatch = freshWatch();
  const watch = platformWatch;

  watch.subscribers.add(send);

  if (!watch.timer) {
    watch.timer = setInterval(() => void tickPlatform(watch), TICK_MS);
  }

  return () => {
    watch.subscribers.delete(send);
    if (watch.subscribers.size === 0) {
      if (watch.timer) clearInterval(watch.timer);
      platformWatch = null;
    }
  };
}
