"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRestaurant } from "@/lib/auth/guards";
import { text } from "@/lib/validation";

/**
 * The restaurant says it has paid and attaches the screenshot. Nothing is
 * marked paid here — a human on the platform side checks it first.
 */
export async function submitPaymentProof(input: {
  invoiceId: string;
  proofUrl: string;
  paymentRef: string;
  note: string;
}) {
  const session = await requireRestaurant(["OWNER"]);

  const ref = text(input.paymentRef);
  if (!input.proofUrl) {
    return { ok: false as const, message: "Attach the payment screenshot." };
  }
  if (ref.length < 6) {
    return {
      ok: false as const,
      message: "Enter the UPI reference number from your payment app.",
    };
  }

  /* Scoped through the subscription so one tenant can't pay another's bill. */
  const invoice = await db.invoice.findFirst({
    where: {
      id: input.invoiceId,
      subscription: { restaurantId: session.restaurantId },
      status: { in: ["DUE", "REJECTED"] },
    },
    select: { id: true },
  });
  if (!invoice) {
    return { ok: false as const, message: "That invoice isn't awaiting payment." };
  }

  await db.invoice.update({
    where: { id: invoice.id },
    data: {
      status: "SUBMITTED",
      proofUrl: input.proofUrl,
      paymentRef: ref,
      payerNote: text(input.note) || null,
      submittedAt: new Date(),
      rejectedReason: null,
    },
  });

  revalidatePath("/dashboard/billing");
  revalidatePath("/admin/billing");
  return { ok: true as const };
}
