"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePage } from "@/lib/auth/guards";
import { text } from "@/lib/validation";

/** A slide with neither a picture nor words would render as a blank card. */
function hasSomethingToShow(input: {
  imageUrl: string | null;
  headline: string;
  subtext: string;
}) {
  return Boolean(input.imageUrl || input.headline || input.subtext);
}

export async function createBanner(input: {
  imageUrl: string | null;
  headline: string;
  subtext: string;
  code: string;
}) {
  const { session } = await requirePage("banners");

  const headline = text(input.headline).slice(0, 80);
  const subtext = text(input.subtext).slice(0, 140);
  const code = text(input.code).toUpperCase().slice(0, 24);
  const imageUrl = text(input.imageUrl) || null;

  if (!hasSomethingToShow({ imageUrl, headline, subtext })) {
    return {
      ok: false as const,
      message: "Add a picture or some words — a blank slide shows nothing.",
    };
  }

  /* New slides go last, so adding one never reshuffles what guests already
     see. The owner drags it up if they want it first. */
  const last = await db.banner.findFirst({
    where: { restaurantId: session.restaurantId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  await db.banner.create({
    data: {
      restaurantId: session.restaurantId,
      imageUrl,
      headline: headline || null,
      subtext: subtext || null,
      code: code || null,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });

  revalidatePath("/dashboard/banners");
  return { ok: true as const };
}

export async function updateBanner(
  bannerId: string,
  input: {
    imageUrl: string | null;
    headline: string;
    subtext: string;
    code: string;
  },
) {
  const { session } = await requirePage("banners");

  const owned = await db.banner.findFirst({
    where: { id: bannerId, restaurantId: session.restaurantId },
    select: { id: true },
  });
  if (!owned) return { ok: false as const, message: "That banner is gone." };

  const headline = text(input.headline).slice(0, 80);
  const subtext = text(input.subtext).slice(0, 140);
  const imageUrl = text(input.imageUrl) || null;

  if (!hasSomethingToShow({ imageUrl, headline, subtext })) {
    return {
      ok: false as const,
      message: "Add a picture or some words — a blank slide shows nothing.",
    };
  }

  await db.banner.update({
    where: { id: owned.id },
    data: {
      imageUrl,
      headline: headline || null,
      subtext: subtext || null,
      code: text(input.code).toUpperCase().slice(0, 24) || null,
    },
  });

  revalidatePath("/dashboard/banners");
  return { ok: true as const };
}

/** Pausing beats deleting for a seasonal poster you'll want again. */
export async function setBannerActive(bannerId: string, isActive: boolean) {
  const { session } = await requirePage("banners");

  const updated = await db.banner.updateMany({
    where: { id: bannerId, restaurantId: session.restaurantId },
    data: { isActive },
  });
  if (updated.count === 0) {
    return { ok: false as const, message: "That banner is gone." };
  }

  revalidatePath("/dashboard/banners");
  return { ok: true as const };
}

export async function deleteBanner(bannerId: string) {
  const { session } = await requirePage("banners");

  const deleted = await db.banner.deleteMany({
    where: { id: bannerId, restaurantId: session.restaurantId },
  });
  if (deleted.count === 0) {
    return { ok: false as const, message: "That banner is gone." };
  }

  revalidatePath("/dashboard/banners");
  return { ok: true as const };
}

/**
 * Moves one slide up or down. Swapping with the neighbour keeps the numbers
 * dense, so the order can never drift into ties after a lot of editing.
 */
export async function moveBanner(bannerId: string, direction: "up" | "down") {
  const { session } = await requirePage("banners");

  const all = await db.banner.findMany({
    where: { restaurantId: session.restaurantId },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });

  const index = all.findIndex((b) => b.id === bannerId);
  if (index === -1) return { ok: false as const, message: "That banner is gone." };

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= all.length) {
    return { ok: false as const, message: "It's already at the end." };
  }

  const reordered = [...all];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  await db.$transaction(
    reordered.map((banner, position) =>
      db.banner.update({ where: { id: banner.id }, data: { sortOrder: position } }),
    ),
  );

  revalidatePath("/dashboard/banners");
  return { ok: true as const };
}
