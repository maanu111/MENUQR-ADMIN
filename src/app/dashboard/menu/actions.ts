"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePage } from "@/lib/auth/guards";
import { firstIssue, text } from "@/lib/validation";

const itemSchema = z.object({
  categoryId: z.string().min(1, "Pick a category"),
  code: z
    .string()
    .trim()
    .min(2, "Give it a short code")
    .max(12)
    .transform((v) => v.toUpperCase()),
  name: z.string().trim().min(2, "Name it").max(80),
  description: z.string().trim().max(240).optional(),
  /** Typed in rupees by a human; stored in paise. */
  price: z.coerce.number().min(1, "Price must be more than zero").max(100000),
  cost: z.coerce.number().min(0).max(100000).default(0),
  diet: z.enum(["VEG", "NONVEG", "EGG"]),
  prepMinutes: z.coerce.number().min(1).max(180).default(15),
});

export async function createMenuItem(formData: FormData) {
  const { session } = await requirePage("menu");

  const parsed = itemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const { field, message } = firstIssue(parsed.error);
    return { ok: false as const, field, message };
  }
  const data = parsed.data;

  /* Codes are what the kitchen shouts; they must be unique per restaurant. */
  const clash = await db.menuItem.findFirst({
    where: { restaurantId: session.restaurantId, code: data.code },
    select: { id: true },
  });
  if (clash) {
    return {
      ok: false as const,
      field: "code",
      message: `${data.code} is already used by another dish.`,
    };
  }

  await db.menuItem.create({
    data: {
      restaurantId: session.restaurantId,
      categoryId: data.categoryId,
      code: data.code,
      name: data.name,
      description: data.description || null,
      pricePaise: Math.round(data.price * 100),
      costPaise: Math.round(data.cost * 100),
      diet: data.diet,
      prepMinutes: data.prepMinutes,
    },
  });

  revalidatePath("/dashboard/menu");
  return { ok: true as const };
}

export async function toggleAvailability(itemId: string, available: boolean) {
  const { session } = await requirePage("menu");

  const updated = await db.menuItem.updateMany({
    where: { id: itemId, restaurantId: session.restaurantId },
    data: { isAvailable: available },
  });
  if (updated.count === 0) {
    return { ok: false as const, message: "That dish is gone." };
  }

  revalidatePath("/dashboard/menu");
  return { ok: true as const };
}

export async function updatePrice(itemId: string, rupees: number) {
  const { session } = await requirePage("menu");

  if (!Number.isFinite(rupees) || rupees < 1 || rupees > 100000) {
    return { ok: false as const, message: "That price doesn't look right." };
  }

  const updated = await db.menuItem.updateMany({
    where: { id: itemId, restaurantId: session.restaurantId },
    data: { pricePaise: Math.round(rupees * 100) },
  });
  if (updated.count === 0) {
    return { ok: false as const, message: "That dish is gone." };
  }

  revalidatePath("/dashboard/menu");
  return { ok: true as const };
}

export async function createCategory(formData: FormData) {
  const { session } = await requirePage("menu");

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) {
    return { ok: false as const, field: "name", message: "Name the section." };
  }

  const clash = await db.category.findFirst({
    where: { restaurantId: session.restaurantId, name },
    select: { id: true },
  });
  if (clash) {
    return {
      ok: false as const,
      field: "name",
      message: "That section already exists.",
    };
  }

  const count = await db.category.count({
    where: { restaurantId: session.restaurantId },
  });

  await db.category.create({
    data: { restaurantId: session.restaurantId, name, sortOrder: count },
  });

  revalidatePath("/dashboard/menu");
  return { ok: true as const };
}

/** Full edit of one dish, including its photo and which section it sits in. */
export async function updateMenuItem(
  itemId: string,
  input: {
    categoryId: string;
    code: string;
    name: string;
    description: string;
    price: number;
    cost: number;
    diet: "VEG" | "NONVEG" | "EGG";
    prepMinutes: number;
    spiceLevel: number;
    imageUrl: string | null;
    isBestseller: boolean;
    isAddOn: boolean;
  },
) {
  const { session } = await requirePage("menu");

  const name = text(input.name);
  const code = text(input.code).toUpperCase();
  if (name.length < 2) return { ok: false as const, message: "Name it." };
  if (code.length < 2) return { ok: false as const, message: "Give it a short code." };
  if (!Number.isFinite(input.price) || input.price < 1) {
    return { ok: false as const, message: "Price must be more than zero." };
  }

  const owned = await db.menuItem.findFirst({
    where: { id: itemId, restaurantId: session.restaurantId },
    select: { id: true },
  });
  if (!owned) return { ok: false as const, message: "That dish is gone." };

  const clash = await db.menuItem.findFirst({
    where: { restaurantId: session.restaurantId, code, NOT: { id: itemId } },
    select: { id: true },
  });
  if (clash) {
    return { ok: false as const, message: `${code} is used by another dish.` };
  }

  await db.menuItem.update({
    where: { id: itemId },
    data: {
      categoryId: input.categoryId,
      code,
      name,
      description: text(input.description) || null,
      pricePaise: Math.round(input.price * 100),
      costPaise: Math.round(Math.max(0, input.cost) * 100),
      diet: input.diet,
      prepMinutes: Math.max(1, Math.round(input.prepMinutes)),
      spiceLevel: Math.min(3, Math.max(0, Math.round(input.spiceLevel))),
      imageUrl: input.imageUrl,
      isBestseller: input.isBestseller,
      isAddOn: input.isAddOn,
    },
  });

  revalidatePath("/dashboard/menu");
  return { ok: true as const };
}

/**
 * Deleting is only offered for a dish nobody has ever ordered. Past orders
 * point at it, and a bill that loses its lines is worse than a stale menu —
 * so anything with history is taken off the menu instead.
 */
export async function deleteMenuItem(itemId: string) {
  const { session } = await requirePage("menu");

  const item = await db.menuItem.findFirst({
    where: { id: itemId, restaurantId: session.restaurantId },
    select: { id: true, name: true, _count: { select: { orderItems: true } } },
  });
  if (!item) return { ok: false as const, message: "That dish is gone." };

  if (item._count.orderItems > 0) {
    return {
      ok: false as const,
      message: `${item.name} is on ${item._count.orderItems} past orders. Mark it sold out instead so your reports stay correct.`,
    };
  }

  await db.menuItem.delete({ where: { id: item.id } });
  revalidatePath("/dashboard/menu");
  return { ok: true as const };
}

export async function renameCategory(categoryId: string, name: string) {
  const { session } = await requirePage("menu");

  const trimmed = name.trim();
  if (trimmed.length < 2) return { ok: false as const, message: "Name the section." };

  const owned = await db.category.findFirst({
    where: { id: categoryId, restaurantId: session.restaurantId },
    select: { id: true },
  });
  if (!owned) return { ok: false as const, message: "That section is gone." };

  const clash = await db.category.findFirst({
    where: {
      restaurantId: session.restaurantId,
      name: trimmed,
      NOT: { id: categoryId },
    },
    select: { id: true },
  });
  if (clash) return { ok: false as const, message: "That section already exists." };

  await db.category.update({ where: { id: categoryId }, data: { name: trimmed } });
  revalidatePath("/dashboard/menu");
  return { ok: true as const };
}

export async function deleteCategory(categoryId: string) {
  const { session } = await requirePage("menu");

  const category = await db.category.findFirst({
    where: { id: categoryId, restaurantId: session.restaurantId },
    select: { id: true, name: true, _count: { select: { items: true } } },
  });
  if (!category) return { ok: false as const, message: "That section is gone." };

  if (category._count.items > 0) {
    return {
      ok: false as const,
      message: `Move or delete the ${category._count.items} dishes in ${category.name} first.`,
    };
  }

  await db.category.delete({ where: { id: category.id } });
  revalidatePath("/dashboard/menu");
  return { ok: true as const };
}
