"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePage } from "@/lib/auth/guards";
import { slugify, text } from "@/lib/validation";

export async function saveRestaurant(input: {
  name: string;
  slug: string;
  fssai: string;
  gstPercent: number;
  serviceHours: string;
  isOpen: boolean;
  acceptsDelivery?: boolean;
  deliveryNote?: string;
  deliveryMin?: number;
}) {
  const { session } = await requirePage("settings");

  const name = text(input.name);
  if (name.length < 2) {
    return { ok: false as const, field: "name", message: "Give the restaurant a name." };
  }

  const slug = slugify(input.slug);
  if (slug.length < 3) {
    return {
      ok: false as const,
      field: "slug",
      message: "The web address needs at least 3 letters.",
    };
  }

  if (!Number.isFinite(input.gstPercent) || input.gstPercent < 0 || input.gstPercent > 28) {
    return { ok: false as const, field: "gstPercent", message: "GST must be 0–28%." };
  }

  /* The slug is the subdomain, so it has to be unique across the platform. */
  const clash = await db.restaurant.findFirst({
    where: { slug, NOT: { id: session.restaurantId } },
    select: { id: true },
  });
  if (clash) {
    return {
      ok: false as const,
      field: "slug",
      message: `${slug} is taken — try something else.`,
    };
  }

  await db.restaurant.update({
    where: { id: session.restaurantId },
    data: {
      name,
      slug,
      fssai: text(input.fssai) || null,
      gstPercent: Math.round(input.gstPercent),
      serviceHours: text(input.serviceHours) || null,
      isOpen: input.isOpen,
      /* Omitted means "leave delivery as it is", not "switch it off" — a
         caller that doesn't know about these fields must not silently close
         a restaurant's delivery service. */
      ...(input.acceptsDelivery === undefined
        ? {}
        : {
            acceptsDelivery: Boolean(input.acceptsDelivery),
            deliveryNote: text(input.deliveryNote).slice(0, 300) || null,
            /* Typed in rupees by a human; stored in paise like every price. */
            deliveryMinPaise: Math.max(
              0,
              Math.round(Number(input.deliveryMin ?? 0) * 100) || 0,
            ),
          }),
    },
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/tables");
  revalidatePath("/dashboard");
  return { ok: true as const, slug };
}
