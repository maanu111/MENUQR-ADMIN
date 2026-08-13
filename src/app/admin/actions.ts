"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { FEATURE_KEYS } from "@/lib/features";
import { requireSuperAdmin } from "@/lib/auth/guards";
import type { SubscriptionStatus } from "@/generated/prisma";
import { text } from "@/lib/validation";

export async function setSubscriptionStatus(
  subscriptionId: string,
  status: SubscriptionStatus,
) {
  await requireSuperAdmin();

  await db.subscription.update({
    where: { id: subscriptionId },
    data: {
      status,
      cancelledAt: status === "CANCELLED" ? new Date() : null,
    },
  });

  revalidatePath("/admin/restaurants");
  revalidatePath("/admin/billing");
  revalidatePath("/admin");
  return { ok: true as const };
}

/**
 * A per-tenant override of what their plan would otherwise allow. Absence of
 * a row means "follow the plan"; a row means the super admin has decided.
 */
export async function toggleFlag(
  restaurantId: string,
  key: string,
  enabled: boolean,
) {
  await requireSuperAdmin();

  await db.featureFlag.upsert({
    where: { restaurantId_key: { restaurantId, key } },
    update: { enabled },
    create: { restaurantId, key, enabled },
  });

  revalidatePath("/admin/flags");
  return { ok: true as const };
}

/* --------------------------------------------------------------- Payments */

/** Where restaurants send subscription money. Empty QR blocks all payment. */
export async function savePaymentSettings(input: {
  upiId: string;
  payeeName: string;
  qrUrl: string | null;
  note: string;
}) {
  await requireSuperAdmin();

  const upiId = text(input.upiId);
  if (upiId && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId)) {
    return { ok: false as const, message: "That doesn't look like a UPI ID." };
  }

  await db.paymentSettings.upsert({
    where: { id: "platform" },
    update: {
      upiId,
      payeeName: text(input.payeeName),
      qrUrl: input.qrUrl,
      note: text(input.note).slice(0, 500),
    },
    create: {
      id: "platform",
      upiId,
      payeeName: text(input.payeeName),
      qrUrl: input.qrUrl,
      note: text(input.note).slice(0, 500),
    },
  });

  revalidatePath("/admin/settings/payment");
  revalidatePath("/dashboard/billing");
  return { ok: true as const };
}

/** Approve a screenshot: the invoice is paid and the account comes back up. */
export async function verifyInvoice(invoiceId: string) {
  const session = await requireSuperAdmin();

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, status: true, subscriptionId: true },
  });
  if (!invoice) return { ok: false as const, message: "That invoice is gone." };
  if (invoice.status !== "SUBMITTED") {
    return { ok: false as const, message: "Nothing has been submitted for review." };
  }

  await db.$transaction([
    db.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        verifiedAt: new Date(),
        verifiedById: session.sub,
        rejectedReason: null,
      },
    }),
    /* Paying the outstanding invoice is what lifts a past-due suspension. */
    db.subscription.update({
      where: { id: invoice.subscriptionId },
      data: { status: "ACTIVE" },
    }),
  ]);

  revalidatePath("/admin/billing");
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function rejectInvoice(invoiceId: string, reason: string) {
  await requireSuperAdmin();

  const trimmed = reason.trim();
  if (trimmed.length < 4) {
    return { ok: false as const, message: "Say why, so they can fix it." };
  }

  const updated = await db.invoice.updateMany({
    where: { id: invoiceId, status: "SUBMITTED" },
    data: { status: "REJECTED", rejectedReason: trimmed },
  });
  if (updated.count === 0) {
    return { ok: false as const, message: "Nothing to reject on that invoice." };
  }

  revalidatePath("/admin/billing");
  return { ok: true as const };
}

/** Raise the next invoice for a restaurant by hand. */
export async function raiseInvoice(subscriptionId: string) {
  await requireSuperAdmin();

  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });
  if (!subscription) return { ok: false as const, message: "No subscription there." };
  if (subscription.plan.pricePaise === 0) {
    return { ok: false as const, message: "Custom plans are invoiced offline." };
  }

  const now = new Date();
  const number = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${randomBytes(2).toString("hex").toUpperCase()}`;

  await db.invoice.create({
    data: {
      subscriptionId: subscription.id,
      number,
      amountPaise: subscription.plan.pricePaise,
      status: "DUE",
      dueAt: new Date(now.getTime() + 7 * 86400000),
    },
  });

  revalidatePath("/admin/billing");
  revalidatePath(`/admin/restaurants/${subscription.restaurantId}`);
  return { ok: true as const, number };
}

/* ------------------------------------------------------------------ Plans */

type PlanInput = {
  name: string;
  blurb: string;
  priceRupees: number;
  maxOutlets: number;
  maxTables: number;
  features: string[];
};

function cleanPlan(input: PlanInput) {
  const name = text(input.name);
  if (name.length < 2) return { error: "Give the plan a name." };

  /* The internal code and the pricing-page order are both derivable, so we
     derive them rather than making a non-technical admin invent them. */
  const tier = name.toUpperCase().replace(/[^A-Z0-9]+/g, "_").slice(0, 24);
  if (!Number.isFinite(input.priceRupees) || input.priceRupees < 0) {
    return { error: "Price can't be negative. Use 0 for custom pricing." };
  }
  if (input.maxOutlets < 1 || input.maxTables < 1) {
    return { error: "Limits must be at least 1." };
  }
  const features = input.features.filter((f) =>
    (FEATURE_KEYS as readonly string[]).includes(f),
  );
  return {
    data: {
      tier,
      name,
      blurb: text(input.blurb) || null,
      pricePaise: Math.round(input.priceRupees * 100),
      maxOutlets: Math.round(input.maxOutlets),
      maxTables: Math.round(input.maxTables),
      features,
      /* Cheapest first; custom-priced plans sit at the end. */
      sortOrder: input.priceRupees === 0 ? 999999 : Math.round(input.priceRupees),
    },
  };
}

export async function createPlan(input: PlanInput) {
  await requireSuperAdmin();
  const parsed = cleanPlan(input);
  if (parsed.error) return { ok: false as const, message: parsed.error };

  const clash = await db.plan.findUnique({ where: { tier: parsed.data!.tier } });
  if (clash) {
    return { ok: false as const, message: `${parsed.data!.tier} already exists.` };
  }

  await db.plan.create({ data: parsed.data! });
  revalidatePath("/admin/plans");
  revalidatePath("/");
  return { ok: true as const };
}

export async function updatePlan(planId: string, input: PlanInput) {
  await requireSuperAdmin();
  const parsed = cleanPlan(input);
  if (parsed.error) return { ok: false as const, message: parsed.error };

  const clash = await db.plan.findFirst({
    where: { tier: parsed.data!.tier, NOT: { id: planId } },
    select: { id: true },
  });
  if (clash) {
    return { ok: false as const, message: `${parsed.data!.tier} is already used.` };
  }

  await db.plan.update({ where: { id: planId }, data: parsed.data! });
  revalidatePath("/admin/plans");
  revalidatePath("/");
  return { ok: true as const };
}

/**
 * Archiving hides a plan from the pricing page and from new signups without
 * disturbing the restaurants already on it — deleting it would orphan them.
 */
export async function setPlanArchived(planId: string, isArchived: boolean) {
  await requireSuperAdmin();
  await db.plan.update({ where: { id: planId }, data: { isArchived } });
  revalidatePath("/admin/plans");
  revalidatePath("/");
  return { ok: true as const };
}

export async function deletePlan(planId: string) {
  await requireSuperAdmin();

  const inUse = await db.subscription.count({ where: { planId } });
  if (inUse > 0) {
    return {
      ok: false as const,
      message: `${inUse} restaurant${inUse === 1 ? " is" : "s are"} on this plan. Archive it instead.`,
    };
  }

  await db.plan.delete({ where: { id: planId } });
  revalidatePath("/admin/plans");
  revalidatePath("/");
  return { ok: true as const };
}

/* --------------------------------------------------------------- Support */

export async function replyAsStaff(ticketId: string, body: string) {
  const session = await requireSuperAdmin();

  const message = body.trim();
  if (message.length < 2) {
    return { ok: false as const, message: "Write something first." };
  }

  const ticket = await db.supportTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, firstReplyAt: true },
  });
  if (!ticket) return { ok: false as const, message: "That conversation is gone." };

  await db.$transaction([
    db.supportMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: session.sub,
        body: message.slice(0, 4000),
        fromStaff: true,
      },
    }),
    db.supportTicket.update({
      where: { id: ticket.id },
      data: {
        /* Answering hands it back to the restaurant. */
        status: "PENDING",
        firstReplyAt: ticket.firstReplyAt ?? new Date(),
      },
    }),
  ]);

  revalidatePath("/admin/support");
  revalidatePath("/dashboard/support");
  return { ok: true as const };
}

export async function resolveTicket(ticketId: string) {
  await requireSuperAdmin();

  await db.supportTicket.update({
    where: { id: ticketId },
    data: { status: "RESOLVED", closedAt: new Date() },
  });

  revalidatePath("/admin/support");
  revalidatePath("/dashboard/support");
  return { ok: true as const };
}
