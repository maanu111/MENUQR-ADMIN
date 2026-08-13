"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRestaurant } from "@/lib/auth/guards";
import type { OrderStage } from "@/generated/prisma";

/** The only forward moves the floor is allowed to make. */
const NEXT: Partial<Record<OrderStage, OrderStage>> = {
  PLACED: "ACCEPTED",
  ACCEPTED: "PREPARING",
  PREPARING: "READY",
  READY: "SERVED",
};

export async function advanceOrder(orderId: string) {
  const session = await requireRestaurant(["OWNER", "MANAGER", "WAITER", "KITCHEN"]);

  /* Scope by restaurant so one tenant can never touch another's ticket. */
  const order = await db.order.findFirst({
    where: { id: orderId, restaurantId: session.restaurantId },
    select: { id: true, stage: true },
  });
  if (!order) return { ok: false as const, message: "That order is gone." };

  const next = NEXT[order.stage];
  if (!next) {
    return { ok: false as const, message: "This order is already finished." };
  }

  await db.order.update({
    where: { id: order.id },
    data: {
      stage: next,
      readyAt: next === "READY" ? new Date() : undefined,
      servedAt: next === "SERVED" ? new Date() : undefined,
    },
  });

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
  return { ok: true as const, stage: next };
}

export async function cancelOrder(orderId: string) {
  /* Waiters can move a ticket forward but not void the money. */
  const session = await requireRestaurant(["OWNER", "MANAGER"]);

  const order = await db.order.findFirst({
    where: { id: orderId, restaurantId: session.restaurantId },
    select: { id: true, stage: true },
  });
  if (!order) return { ok: false as const, message: "That order is gone." };
  if (order.stage === "SERVED") {
    return { ok: false as const, message: "Served orders can't be cancelled." };
  }

  await db.order.update({
    where: { id: order.id },
    data: { stage: "CANCELLED" },
  });

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
  return { ok: true as const, stage: "CANCELLED" as const };
}

export async function markPaid(orderId: string) {
  const session = await requireRestaurant(["OWNER", "MANAGER", "WAITER"]);

  const updated = await db.order.updateMany({
    where: { id: orderId, restaurantId: session.restaurantId },
    data: { paymentStatus: "PAID" },
  });
  if (updated.count === 0) {
    return { ok: false as const, message: "That order is gone." };
  }

  revalidatePath("/dashboard/orders");
  return { ok: true as const };
}

/** Clears a table's call once someone has actually gone over. */
export async function acknowledgeCall(callId: string) {
  const session = await requireRestaurant([
    "OWNER",
    "MANAGER",
    "WAITER",
    "KITCHEN",
  ]);

  const updated = await db.waiterCall.updateMany({
    where: {
      id: callId,
      restaurantId: session.restaurantId,
      acknowledgedAt: null,
    },
    data: { acknowledgedAt: new Date(), acknowledgedById: session.sub },
  });
  if (updated.count === 0) {
    return { ok: false as const, message: "Someone already took that one." };
  }

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
