"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRestaurant, requirePage } from "@/lib/auth/guards";
import { assignableFor } from "@/lib/permissions";
import { hashPassword } from "@/lib/auth/password";
import { emailSchema, firstIssue } from "@/lib/validation";
import { Prisma, type StaffRole } from "@/generated/prisma";

const inviteSchema = z.object({
  name: z.string().trim().min(2, "Give them a name").max(80),
  email: emailSchema,
  role: z.enum(["MANAGER", "WAITER", "KITCHEN"]),
  password: z
    .string()
    .min(8, "Passwords need at least 8 characters")
    .max(200, "That password is too long"),
});

/**
 * Creates the login there and then, with a password the owner chooses and can
 * hand over in person — a waiter who can't sign in on their first shift is
 * worse than useless.
 */
export async function inviteStaff(formData: FormData) {
  const session = await requireRestaurant(["OWNER", "MANAGER"]);

  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const { field, message } = firstIssue(parsed.error);
    return { ok: false as const, field, message };
  }
  const { name, email, role, password } = parsed.data;

  const existing = await db.user.findUnique({
    where: { email },
    include: { memberships: { where: { restaurantId: session.restaurantId } } },
  });

  if (existing?.memberships.length) {
    return {
      ok: false as const,
      field: "email",
      message: "They already work here.",
    };
  }

  if (existing) {
    await db.membership.create({
      data: {
        userId: existing.id,
        restaurantId: session.restaurantId,
        role,
        acceptedAt: new Date(),
      },
    });
    revalidatePath("/dashboard/staff");
    return { ok: true as const };
  }

  await db.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      memberships: {
        create: {
          restaurantId: session.restaurantId,
          role,
          acceptedAt: new Date(),
        },
      },
    },
  });

  revalidatePath("/dashboard/staff");
  return { ok: true as const };
}

export async function changeRole(membershipId: string, role: StaffRole) {
  const session = await requireRestaurant(["OWNER"]);

  if (role === "OWNER") {
    return { ok: false as const, message: "Ownership can't be handed over here." };
  }

  const membership = await db.membership.findFirst({
    where: { id: membershipId, restaurantId: session.restaurantId },
    select: { id: true, role: true },
  });
  if (!membership) return { ok: false as const, message: "That person is gone." };
  if (membership.role === "OWNER") {
    return { ok: false as const, message: "The owner's role can't be changed." };
  }

  await db.membership.update({ where: { id: membership.id }, data: { role } });
  revalidatePath("/dashboard/staff");
  return { ok: true as const };
}

export async function setStaffActive(membershipId: string, isActive: boolean) {
  const session = await requireRestaurant(["OWNER", "MANAGER"]);

  const membership = await db.membership.findFirst({
    where: { id: membershipId, restaurantId: session.restaurantId },
    select: { id: true, role: true },
  });
  if (!membership) return { ok: false as const, message: "That person is gone." };
  if (membership.role === "OWNER") {
    return { ok: false as const, message: "The owner can't be removed." };
  }

  await db.membership.update({ where: { id: membership.id }, data: { isActive } });

  revalidatePath("/dashboard/staff");
  return {
    ok: true as const,
    message: isActive
      ? "They can sign in again."
      : "Removed — they can no longer sign in.",
  };
}

/**
 * Hands one person an explicit page list, or null to fall back to the role
 * default. Owners only — a manager could otherwise grant themselves billing.
 */
export async function setStaffPages(membershipId: string, pages: string[] | null) {
  const { session } = await requirePage("staff");

  const membership = await db.membership.findFirst({
    where: { id: membershipId, restaurantId: session.restaurantId },
    select: { id: true, role: true },
  });
  if (!membership) return { ok: false as const, message: "That person is gone." };
  if (membership.role === "OWNER") {
    return { ok: false as const, message: "The owner already has everything." };
  }

  if (pages) {
    const valid = new Set(assignableFor(membership.role).map((p) => p.key));
    const clean = [...new Set(pages)].filter((key) => valid.has(key as never));
    if (clean.length === 0) {
      return {
        ok: false as const,
        message: "Give them at least one page, or switch back to the standard set.",
      };
    }
    await db.membership.update({
      where: { id: membership.id },
      data: { pages: clean },
    });
  } else {
    await db.membership.update({
      where: { id: membership.id },
      data: { pages: Prisma.DbNull },
    });
  }

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
