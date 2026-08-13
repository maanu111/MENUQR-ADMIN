"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRestaurant } from "@/lib/auth/guards";
import { text } from "@/lib/validation";

export type PosLine = { menuItemId: string; qty: number };

/** Short, human-readable, unique inside the restaurant. Staff read it aloud. */
async function nextCode(restaurantId: string) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = `K-${Math.floor(1000 + Math.random() * 9000)}`;
    const taken = await db.order.findFirst({
      where: { restaurantId, code },
      select: { id: true },
    });
    if (!taken) return code;
  }
  return `K-${Date.now().toString().slice(-6)}`;
}

export async function createPosOrder(input: {
  lines: PosLine[];
  tableId: string | null;
  guests: number;
  note: string;
}) {
  const session = await requireRestaurant(["OWNER", "MANAGER", "WAITER"]);

  const lines = input.lines.filter((l) => l.qty > 0);
  if (lines.length === 0) {
    return { ok: false as const, message: "Add something to the order first." };
  }

  /* Re-read prices server-side; never trust what the browser sent. */
  const items = await db.menuItem.findMany({
    where: {
      id: { in: lines.map((l) => l.menuItemId) },
      restaurantId: session.restaurantId,
    },
    select: {
      id: true,
      name: true,
      pricePaise: true,
      costPaise: true,
      isAvailable: true,
    },
  });

  const unavailable = items.find((i) => !i.isAvailable);
  if (unavailable) {
    return {
      ok: false as const,
      message: `${unavailable.name} is marked sold out.`,
    };
  }
  if (items.length !== lines.length) {
    return { ok: false as const, message: "Something on this order no longer exists." };
  }

  const restaurant = await db.restaurant.findUniqueOrThrow({
    where: { id: session.restaurantId },
    select: { gstPercent: true },
  });

  const priced = lines.map((line) => {
    const item = items.find((i) => i.id === line.menuItemId)!;
    return {
      menuItemId: item.id,
      nameSnapshot: item.name,
      unitPricePaise: item.pricePaise,
      costPaise: item.costPaise,
      qty: line.qty,
    };
  });

  const subtotal = priced.reduce((sum, l) => sum + l.qty * l.unitPricePaise, 0);
  const tax = Math.round((subtotal * restaurant.gstPercent) / 100);

  const order = await db.order.create({
    data: {
      restaurantId: session.restaurantId,
      tableId: input.tableId,
      code: await nextCode(session.restaurantId),
      channel: "POS",
      stage: "ACCEPTED",
      guests: Math.max(1, Math.min(input.guests, 30)),
      note: text(input.note) || null,
      subtotalPaise: subtotal,
      taxPaise: tax,
      totalPaise: subtotal + tax,
      takenById: session.sub,
      items: { create: priced },
    },
    select: { id: true, code: true },
  });

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
  return { ok: true as const, code: order.code };
}
