"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRestaurant } from "@/lib/auth/guards";

export async function upsertStock(formData: FormData) {
  const session = await requireRestaurant(["OWNER", "MANAGER"]);

  const name = String(formData.get("name") ?? "").trim();
  const unit = String(formData.get("unit") ?? "kg").trim() || "kg";
  const quantity = Number(formData.get("quantity") ?? 0);
  const lowAt = Number(formData.get("lowAt") ?? 0);

  if (name.length < 2) {
    return { ok: false as const, message: "Name the ingredient." };
  }
  if (!Number.isFinite(quantity) || quantity < 0) {
    return { ok: false as const, message: "Quantity can't be negative." };
  }

  await db.inventoryItem.upsert({
    where: { restaurantId_name: { restaurantId: session.restaurantId, name } },
    update: { unit, quantity, lowAt },
    create: { restaurantId: session.restaurantId, name, unit, quantity, lowAt },
  });

  revalidatePath("/dashboard/inventory");
  return { ok: true as const };
}

/** Quick +/- from the list, so a manager can correct stock mid-service. */
export async function adjustStock(itemId: string, delta: number) {
  const session = await requireRestaurant(["OWNER", "MANAGER"]);

  const item = await db.inventoryItem.findFirst({
    where: { id: itemId, restaurantId: session.restaurantId },
    select: { id: true, quantity: true },
  });
  if (!item) return { ok: false as const, message: "That item is gone." };

  await db.inventoryItem.update({
    where: { id: item.id },
    data: { quantity: Math.max(0, item.quantity + delta) },
  });

  revalidatePath("/dashboard/inventory");
  return { ok: true as const };
}
