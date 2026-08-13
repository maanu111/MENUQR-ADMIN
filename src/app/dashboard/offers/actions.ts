"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRestaurant } from "@/lib/auth/guards";

export async function createOffer(formData: FormData) {
  const session = await requireRestaurant(["OWNER", "MANAGER"]);

  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();
  const kind = String(formData.get("kind") ?? "PERCENT") as "PERCENT" | "FLAT";
  const value = Number(formData.get("value") ?? 0);
  const minSpend = Number(formData.get("minSpend") ?? 0);

  if (code.length < 3) {
    return { ok: false as const, message: "Codes need at least 3 characters." };
  }
  if (!Number.isFinite(value) || value <= 0) {
    return { ok: false as const, message: "Give the offer a value." };
  }
  if (kind === "PERCENT" && value > 90) {
    return { ok: false as const, message: "90% off is almost certainly a typo." };
  }

  const clash = await db.offer.findFirst({
    where: { restaurantId: session.restaurantId, code },
    select: { id: true },
  });
  if (clash) {
    return { ok: false as const, message: `${code} already exists.` };
  }

  await db.offer.create({
    data: {
      restaurantId: session.restaurantId,
      code,
      kind,
      /* Percent stays a percent; flat is money, so it goes in as paise. */
      value: kind === "PERCENT" ? Math.round(value) : Math.round(value * 100),
      minSpendPaise: Math.round(minSpend * 100),
    },
  });

  revalidatePath("/dashboard/offers");
  return { ok: true as const };
}

export async function setOfferActive(offerId: string, isActive: boolean) {
  const session = await requireRestaurant(["OWNER", "MANAGER"]);

  const updated = await db.offer.updateMany({
    where: { id: offerId, restaurantId: session.restaurantId },
    data: { isActive },
  });
  if (updated.count === 0) {
    return { ok: false as const, message: "That offer is gone." };
  }

  revalidatePath("/dashboard/offers");
  return { ok: true as const };
}
