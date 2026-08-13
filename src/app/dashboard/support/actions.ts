"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePage } from "@/lib/auth/guards";
import { TICKET_TOPICS } from "@/lib/tickets";
import type { TicketPriority } from "@/generated/prisma";
import { text } from "@/lib/validation";

const TOPICS = new Set(TICKET_TOPICS.map((t) => t.key as string));

export async function openTicket(input: {
  subject: string;
  category: string;
  priority: string;
  body: string;
}) {
  const { session } = await requirePage("support");

  const subject = text(input.subject);
  const body = text(input.body);

  if (subject.length < 4) {
    return { ok: false as const, message: "Give it a short title so we can find it." };
  }
  if (body.length < 10) {
    return { ok: false as const, message: "Tell us a little more about what happened." };
  }

  const ticket = await db.supportTicket.create({
    data: {
      restaurantId: session.restaurantId,
      openedById: session.sub,
      subject: subject.slice(0, 160),
      category: TOPICS.has(input.category) ? input.category : "general",
      priority: (["LOW", "NORMAL", "HIGH", "URGENT"].includes(input.priority)
        ? input.priority
        : "NORMAL") as TicketPriority,
      messages: {
        create: { authorId: session.sub, body: body.slice(0, 4000) },
      },
    },
    select: { id: true },
  });

  revalidatePath("/dashboard/support");
  revalidatePath("/admin/support");
  return { ok: true as const, id: ticket.id };
}

export async function replyToTicket(ticketId: string, body: string) {
  const { session } = await requirePage("support");

  const message = body.trim();
  if (message.length < 2) {
    return { ok: false as const, message: "Write something first." };
  }

  const ticket = await db.supportTicket.findFirst({
    where: { id: ticketId, restaurantId: session.restaurantId },
    select: { id: true, status: true },
  });
  if (!ticket) return { ok: false as const, message: "That conversation is gone." };

  await db.$transaction([
    db.supportMessage.create({
      data: { ticketId: ticket.id, authorId: session.sub, body: message.slice(0, 4000) },
    }),
    /* Replying puts the ball back in the platform's court. */
    db.supportTicket.update({
      where: { id: ticket.id },
      data: { status: ticket.status === "CLOSED" ? "OPEN" : "OPEN" },
    }),
  ]);

  revalidatePath("/dashboard/support");
  revalidatePath("/admin/support");
  return { ok: true as const };
}

export async function closeTicket(ticketId: string) {
  const { session } = await requirePage("support");

  const updated = await db.supportTicket.updateMany({
    where: { id: ticketId, restaurantId: session.restaurantId },
    data: { status: "CLOSED", closedAt: new Date() },
  });
  if (updated.count === 0) {
    return { ok: false as const, message: "That conversation is gone." };
  }

  revalidatePath("/dashboard/support");
  revalidatePath("/admin/support");
  return { ok: true as const };
}
