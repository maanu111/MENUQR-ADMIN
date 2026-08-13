import Link from "next/link";
import { PageHeader } from "@/components/app/Shell";
import { Empty, StatGrid, StatTile } from "@/components/app/StatTile";
import { FilterBar } from "@/components/app/FilterBar";
import { SupportInbox } from "@/components/app/SupportInbox";
import { LiveUpdates } from "@/components/app/LiveUpdates";
import type { Thread } from "@/components/app/TicketThread";
import { requireSuperAdmin } from "@/lib/auth/guards";
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

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireSuperAdmin();
  const params = await searchParams;
  const query = (params.q ?? "").trim();

  const [tickets, openCount, urgentCount, pastDue] = await Promise.all([
    db.supportTicket.findMany({
      where: {
        ...(params.status ? { status: params.status as "OPEN" } : {}),
        ...(params.priority ? { priority: params.priority as "URGENT" } : {}),
        ...(query
          ? {
              OR: [
                { subject: { contains: query } },
                { restaurant: { name: { contains: query } } },
              ],
            }
          : {}),
      },
      /* Loudest first: waiting on us, then most urgent, then oldest. */
      orderBy: [{ status: "asc" }, { priority: "desc" }, { updatedAt: "desc" }],
      take: 40,
      include: {
        restaurant: { select: { id: true, name: true } },
        openedBy: { select: { name: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { name: true } } },
        },
      },
    }),
    db.supportTicket.count({ where: { status: "OPEN" } }),
    db.supportTicket.count({
      where: { status: { in: ["OPEN", "PENDING"] }, priority: "URGENT" },
    }),
    db.subscription.count({ where: { status: "PAST_DUE" } }),
  ]);

  const threads: Thread[] = tickets.map((ticket) => ({
    id: ticket.id,
    subject: ticket.subject,
    topic: topicLabel(ticket.category),
    status: ticket.status,
    statusLabel: TICKET_STATUS_LABEL[ticket.status] ?? ticket.status,
    statusTone: TICKET_STATUS_TONE[ticket.status] ?? "text-ink-2",
    priorityLabel: PRIORITY_LABEL[ticket.priority] ?? ticket.priority,
    priorityTone: PRIORITY_TONE[ticket.priority] ?? "text-ink-2",
    restaurantName: ticket.restaurant.name,
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

  return (
    <>
      <PageHeader
        title="Support"
        lede="Questions from restaurants, newest need first."
        action={<LiveUpdates source="/api/admin-stream" />}
      />

      <div className="flex flex-col gap-6 px-5 py-6 sm:px-8">
        <StatGrid>
          <StatTile
            label="Waiting on you"
            value={String(openCount)}
            foot={openCount > 0 ? "answer these first" : "all answered"}
            tone={openCount > 0 ? "warn" : "good"}
          />
          <StatTile
            label="Urgent"
            value={String(urgentCount)}
            foot={urgentCount > 0 ? "restaurant is stuck" : "nothing urgent"}
            tone={urgentCount > 0 ? "warn" : "good"}
          />
          <StatTile
            label="Past due accounts"
            value={String(pastDue)}
            foot={pastDue > 0 ? "may need a nudge" : "everyone has paid"}
            tone={pastDue > 0 ? "warn" : "good"}
          />
          <StatTile label="Conversations" value={String(threads.length)} foot="shown here" />
        </StatGrid>

        <FilterBar
          showRange={false}
          searchPlaceholder="Subject or restaurant name"
          selects={[
            {
              name: "status",
              label: "Status",
              options: [
                { value: "OPEN", label: "Waiting on us" },
                { value: "PENDING", label: "Waiting on them" },
                { value: "RESOLVED", label: "Sorted" },
                { value: "CLOSED", label: "Closed" },
              ],
            },
            {
              name: "priority",
              label: "Urgency",
              options: [
                { value: "URGENT", label: "Stuck right now" },
                { value: "HIGH", label: "Today please" },
                { value: "NORMAL", label: "Normal" },
                { value: "LOW", label: "Whenever" },
              ],
            },
          ]}
        />

        {threads.length === 0 ? (
          <Empty
            title={query || params.status ? "Nothing matches that" : "No questions yet"}
            body={
              query || params.status
                ? "Clear the filters to see every conversation."
                : "When a restaurant asks for help from their dashboard, it lands here."
            }
            action={
              <Link
                href="/admin/restaurants"
                className="text-[0.8125rem] font-medium text-brand hover:underline"
              >
                See all restaurants →
              </Link>
            }
          />
        ) : (
          <SupportInbox threads={threads} />
        )}
      </div>
    </>
  );
}
