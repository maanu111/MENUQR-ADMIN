"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePage } from "@/lib/auth/guards";
import { text } from "@/lib/validation";

/** Six-digit hex only — this value is interpolated into the guest page's CSS. */
const HEX = /^#[0-9a-fA-F]{6}$/;

export async function saveBranding(input: {
  logoUrl: string | null;
  brandColor: string;
  menuTheme: string;
  menuNote: string;
  tagline: string;
}) {
  const { session } = await requirePage("branding");

  const color = text(input.brandColor);
  if (!HEX.test(color)) {
    return { ok: false as const, message: "Pick a colour, or enter it as #RRGGBB." };
  }
  const theme = input.menuTheme === "dark" ? "dark" : "light";

  await db.restaurant.update({
    where: { id: session.restaurantId },
    data: {
      logoUrl: input.logoUrl,
      brandColor: color,
      menuTheme: theme,
      menuNote: text(input.menuNote).slice(0, 120) || null,
      tagline: text(input.tagline).slice(0, 120) || null,
    },
  });

  revalidatePath("/dashboard/branding");
  return { ok: true as const };
}
