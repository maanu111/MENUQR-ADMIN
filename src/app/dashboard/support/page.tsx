import { PageHeader } from "@/components/app/Shell";
import { SupportBoard } from "@/components/app/SupportBoard";
import { LiveUpdates } from "@/components/app/LiveUpdates";
import type { Thread } from "@/components/app/TicketThread";
import { requirePage } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import {
  PRIORITY_LABEL,
  PRIORITY_TONE,
  TICKET_STATUS_LABEL,
  TICKET_STATUS_TONE,
  since,
  topicLabel,
} from "@/lib/tickets";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const { session } = await requirePage("support");

  const tickets = await db.supportTicket.findMany({
    where: { restaurantId: session.restaurantId },
    orderBy: { updatedAt: "desc" },
    include: {
      openedBy: { select: { name: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      },
    },
  });

  const threads: Thread[] = tickets.map((ticket) => ({
    id: ticket.id,
    subject: ticket.subject,
    topic: topicLabel(ticket.category),
    status: ticket.status,
    statusLabel: TICKET_STATUS_LABEL[ticket.status] ?? ticket.status,
    statusTone: TICKET_STATUS_TONE[ticket.status] ?? "text-ink-2",
    priorityLabel: PRIORITY_LABEL[ticket.priority] ?? ticket.priority,
    priorityTone: PRIORITY_TONE[ticket.priority] ?? "text-ink-2",
    openedBy: ticket.openedBy.name,
    ago: since(ticket.createdAt),
    messages: ticket.messages.map((message) => ({
      id: message.id,
      body: message.body,
      fromStaff: message.fromStaff,
      authorName: message.author.name,
      createdAt: message.createdAt.toISOString(),
      ago: since(message.createdAt),
    })),
  }));

  const waiting = threads.filter(
    (t) => t.status === "OPEN" || t.status === "PENDING",
  ).length;

  return (
    <>
      <PageHeader
        title="Support"
        lede={
          threads.length === 0
            ? "Stuck on something? Ask here and a person will answer."
            : `${waiting} open · ${threads.length} in total`
        }
        action={<LiveUpdates />}
      />

      <div className="px-5 py-6 sm:px-8">
        <SupportBoard threads={threads} />
      </div>
    </>
  );
}
