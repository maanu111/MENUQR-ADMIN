import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/Shell";
import { StatGrid, StatTile } from "@/components/app/StatTile";
import { OrderCard, type OrderCardData } from "@/components/app/OrderCard";
import { requirePage } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { rupees } from "@/lib/money";

export const dynamic = "force-dynamic";

const STEPS = [
  { key: "placedAt", label: "Sent to kitchen" },
  { key: "readyAt", label: "Ready" },
  { key: "servedAt", label: "Served" },
] as const;

function moment(date: Date | null) {
  if (!date) return null;
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { session, role } = await requirePage("orders");
  const { id } = await params;

  const order = await db.order.findFirst({
    where: { id, restaurantId: session.restaurantId },
    include: {
      table: { select: { number: true, section: true } },
      takenBy: { select: { name: true } },
      items: {
        select: {
          id: true,
          nameSnapshot: true,
          qty: true,
          unitPricePaise: true,
          costPaise: true,
          optionLabels: true,
          note: true,
        },
      },
    },
  });

  if (!order) notFound();

  const margin = order.items.reduce(
    (sum, item) => sum + item.qty * (item.unitPricePaise - item.costPaise),
    0,
  );

  /* How long the kitchen actually took, once it is known. */
  const minutesToReady = order.readyAt
    ? Math.round((+order.readyAt - +order.placedAt) / 60000)
    : null;

  const card: OrderCardData = {
    id: order.id,
    code: order.code,
    stage: order.stage,
    channel: order.channel,
    guests: order.guests,
    totalPaise: order.totalPaise,
    paymentStatus: order.paymentStatus,
    placedAt: order.placedAt.toISOString(),
    tableNumber: order.table?.number ?? null,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerAddress: order.customerAddress,
    addressNote: order.addressNote,
    note: order.note,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.nameSnapshot,
      qty: item.qty,
      options: Array.isArray(item.optionLabels)
        ? (item.optionLabels as string[])
        : [],
    })),
  };

  return (
    <>
      <PageHeader
        title={`Order ${order.code}`}
        lede={`${order.table ? `Table ${order.table.number}` : order.channel} · ${order.guests} ${order.guests === 1 ? "guest" : "guests"} · ${moment(order.placedAt)}`}
        action={
          <Link
            href="/dashboard/orders"
            className="rounded-lg border border-line bg-ground px-4 py-2 text-[0.8125rem] font-semibold text-ink transition hover:bg-surface-2"
          >
            Back to queue
          </Link>
        }
      />

      <div className="flex flex-col gap-6 px-5 py-6 sm:px-8">
        <StatGrid>
          <StatTile label="Total" value={rupees(order.totalPaise)} foot="what they pay" />
          <StatTile
            label="Margin"
            value={rupees(margin)}
            foot="after ingredient cost"
            tone="good"
          />
          <StatTile
            label="Payment"
            value={order.paymentStatus === "PAID" ? "Paid" : "Unpaid"}
            foot={order.channel === "QR" ? "ordered from the table" : "taken at the counter"}
            tone={order.paymentStatus === "PAID" ? "good" : "warn"}
          />
          <StatTile
            label="Kitchen time"
            value={minutesToReady === null ? "—" : `${minutesToReady} min`}
            foot={minutesToReady === null ? "still cooking" : "sent to ready"}
          />
        </StatGrid>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          {/* The same card the queue uses, so the actions behave identically. */}
          <OrderCard
            order={card}
            canCancel={
              (role === "OWNER" || role === "MANAGER") && order.stage !== "SERVED"
            }
          />

          <div className="flex flex-col gap-5">
            <section className="rounded-xl border border-line bg-ground p-5">
              <h2 className="text-[0.8125rem] font-semibold text-ink">The bill</h2>
              <dl className="mt-3 flex flex-col gap-1.5 text-[0.8125rem]">
                <div className="flex justify-between">
                  <dt className="text-ink-2">Subtotal</dt>
                  <dd className="num text-ink">{rupees(order.subtotalPaise)}</dd>
                </div>
                {order.discountPaise > 0 ? (
                  <div className="flex justify-between">
                    <dt className="text-good">Discount</dt>
                    <dd className="num text-good">
                      −{rupees(order.discountPaise)}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <dt className="text-ink-2">GST</dt>
                  <dd className="num text-ink">{rupees(order.taxPaise)}</dd>
                </div>
                <div className="mt-1 flex justify-between border-t border-line pt-2">
                  <dt className="font-semibold text-ink">Total</dt>
                  <dd className="num font-semibold text-ink">
                    {rupees(order.totalPaise)}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-xl border border-line bg-ground p-5">
              <h2 className="text-[0.8125rem] font-semibold text-ink">Timeline</h2>
              <ol className="mt-3 flex flex-col gap-2.5">
                {STEPS.map((step) => {
                  const at = order[step.key] as Date | null;
                  return (
                    <li key={step.key} className="flex items-baseline gap-3">
                      <span
                        aria-hidden="true"
                        className={`size-1.5 shrink-0 rounded-full ${
                          at ? "bg-good" : "bg-line-strong"
                        }`}
                      />
                      <span
                        className={`flex-1 text-[0.8125rem] ${
                          at ? "text-ink" : "text-ink-3"
                        }`}
                      >
                        {step.label}
                      </span>
                      <span className="num text-[0.6875rem] text-ink-3">
                        {moment(at) ?? "—"}
                      </span>
                    </li>
                  );
                })}
              </ol>
              {order.takenBy ? (
                <p className="mt-3 border-t border-line pt-3 text-[0.75rem] text-ink-3">
                  Taken by {order.takenBy.name}
                </p>
              ) : null}
            </section>

            {order.customerName || order.customerPhone ? (
              <section className="rounded-xl border border-line bg-ground p-5">
                <h2 className="text-[0.8125rem] font-semibold text-ink">Guest</h2>
                <p className="mt-2 text-[0.8125rem] text-ink">
                  {order.customerName ?? "—"}
                </p>
                {order.customerPhone ? (
                  <a
                    href={`tel:${order.customerPhone}`}
                    className="num mt-0.5 block text-[0.8125rem] text-brand hover:underline"
                  >
                    {order.customerPhone}
                  </a>
                ) : null}
                {order.occasion ? (
                  <p className="mt-2 rounded-lg bg-brand-wash px-2.5 py-1 text-[0.6875rem] text-brand">
                    {order.occasion}
                  </p>
                ) : null}
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
