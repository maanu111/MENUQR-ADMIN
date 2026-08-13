"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRestaurant } from "@/lib/auth/guards";
import { text } from "@/lib/validation";

export async function createTable(formData: FormData) {
  const session = await requireRestaurant(["OWNER", "MANAGER"]);

  const number = String(formData.get("number") ?? "").trim();
  const seats = Number(formData.get("seats") ?? 4);
  const section = String(formData.get("section") ?? "").trim();

  if (!number) {
    return { ok: false as const, field: "number", message: "Give the table a number." };
  }
  if (!Number.isFinite(seats) || seats < 1 || seats > 40) {
    return { ok: false as const, field: "seats", message: "Seats must be 1–40." };
  }

  const clash = await db.restaurantTable.findFirst({
    where: { restaurantId: session.restaurantId, number },
    select: { id: true },
  });
  if (clash) {
    return {
      ok: false as const,
      field: "number",
      message: `Table ${number} already exists.`,
    };
  }

  /* Random token, never the row id — otherwise guests could guess neighbours. */
  await db.restaurantTable.create({
    data: {
      restaurantId: session.restaurantId,
      number,
      seats,
      section: section || null,
      qrToken: randomBytes(4).toString("hex").toUpperCase(),
    },
  });

  revalidatePath("/dashboard/tables");
  return { ok: true as const };
}

export async function setTableActive(tableId: string, isActive: boolean) {
  const session = await requireRestaurant(["OWNER", "MANAGER"]);

  const updated = await db.restaurantTable.updateMany({
    where: { id: tableId, restaurantId: session.restaurantId },
    data: { isActive },
  });
  if (updated.count === 0) {
    return { ok: false as const, message: "That table is gone." };
  }

  revalidatePath("/dashboard/tables");
  return { ok: true as const };
}



/** Edit the number, seats or section without touching the printed code. */
export async function updateTable(
  tableId: string,
  input: { number: string; seats: number; section: string },
) {
  const session = await requireRestaurant(["OWNER", "MANAGER"]);

  const number = text(input.number);
  if (!number) {
    return { ok: false as const, message: "Give the table a number." };
  }
  if (!Number.isFinite(input.seats) || input.seats < 1 || input.seats > 40) {
    return { ok: false as const, message: "Seats must be 1-40." };
  }

  const owned = await db.restaurantTable.findFirst({
    where: { id: tableId, restaurantId: session.restaurantId },
    select: { id: true },
  });
  if (!owned) return { ok: false as const, message: "That table is gone." };

  const clash = await db.restaurantTable.findFirst({
    where: {
      restaurantId: session.restaurantId,
      number,
      NOT: { id: tableId },
    },
    select: { id: true },
  });
  if (clash) {
    return { ok: false as const, message: `Table ${number} already exists.` };
  }

  await db.restaurantTable.update({
    where: { id: tableId },
    data: { number, seats: input.seats, section: text(input.section) || null },
  });

  revalidatePath("/dashboard/tables");
  return { ok: true as const };
}

/**
 * Only removable while it has no history. A table with past orders is
 * retired instead, so those bills keep pointing somewhere real.
 */
export async function deleteTable(tableId: string) {
  const session = await requireRestaurant(["OWNER", "MANAGER"]);

  const table = await db.restaurantTable.findFirst({
    where: { id: tableId, restaurantId: session.restaurantId },
    select: {
      id: true,
      number: true,
      _count: { select: { orders: true } },
    },
  });
  if (!table) return { ok: false as const, message: "That table is gone." };

  if (table._count.orders > 0) {
    return {
      ok: false as const,
      message: `Table ${table.number} has ${table._count.orders} past orders. Retire it instead so those bills stay intact.`,
    };
  }

  await db.restaurantTable.delete({ where: { id: table.id } });
  revalidatePath("/dashboard/tables");
  return { ok: true as const };
}
