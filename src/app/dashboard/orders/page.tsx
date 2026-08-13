import Link from "next/link";
import { PageHeader } from "@/components/app/Shell";
import { Empty } from "@/components/app/StatTile";
import { FilterBar } from "@/components/app/FilterBar";
import { OrderCard, type OrderCardData } from "@/components/app/OrderCard";
import { WaiterCalls, type CallRow } from "@/components/app/WaiterCalls";
import { LiveUpdates } from "@/components/app/LiveUpdates";
import { requirePage } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { resolveRange } from "@/lib/range";
import { rupees } from "@/lib/money";
import type { OrderStage, Prisma } from "@/generated/prisma";

export const dynamic = "force-dynamic";

/* Live tickets first; anything closed drops into history. */
const LANES: { stage: OrderStage; label: string }[] = [
  { stage: "PLACED", label: "New" },
  { stage: "ACCEPTED", label: "Accepted" },
  { stage: "PREPARING", label: "Cooking" },
  { stage: "READY", label: "Ready" },
];

const STAGE_OPTIONS = [
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "SERVED",
  "CANCELLED",
].map((s) => ({ value: s, label: s.toLowerCase() }));

const CHANNEL_OPTIONS = [
  { value: "QR", label: "Table QR" },
  { value: "POS", label: "Counter" },
  { value: "PHONE", label: "Phone" },
];

const PAGE_SIZE = 40;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { session, role } = await requirePage("orders");
  const params = await searchParams;

  /* No filters at all means "run the floor"; any filter means "go looking". */
  const filtering = Boolean(
    params.range || params.stage || params.channel || params.q,
  );
  const range = resolveRange(params);
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const query = (params.q ?? "").trim();

  const canCancel = role === "OWNER" || role === "MANAGER";

  const toCard = (order: {
    id: string;
    code: string;
    stage: string;
    channel: string;
    guests: number;
    totalPaise: number;
    paymentStatus: string;
    placedAt: Date;
    customerName: string | null;
    customerPhone: string | null;
    customerAddress: string | null;
    addressNote: string | null;
    note: string | null;
    table: { number: string } | null;
    items: { id: string; nameSnapshot: string; qty: number; optionLabels: unknown }[];
  }): OrderCardData => ({
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
      options: Array.isArray(item.optionLabels) ? (item.optionLabels as string[]) : [],
    })),
  });

  const include = {
    table: { select: { number: true } },
    items: {
      select: { id: true, nameSnapshot: true, qty: true, optionLabels: true },
    },
  } as const;

  const filters = (
    <FilterBar
      searchPlaceholder="Order code, name or phone"
      exportPath="/api/export/orders"
      selects={[
        { name: "stage", label: "Stage", options: STAGE_OPTIONS },
        { name: "channel", label: "Channel", options: CHANNEL_OPTIONS },
      ]}
    />
  );

  if (!filtering) {
    const [live, openCalls] = await Promise.all([
      db.order.findMany({
        where: {
          restaurantId: session.restaurantId,
          stage: { in: LANES.map((l) => l.stage) },
          /* Deliveries have their own screen — a rider's job and a waiter's
             job do not belong in the same queue. */
          channel: { not: "DELIVERY" },
        },
        include,
        orderBy: { placedAt: "asc" },
      }),
      db.waiterCall.findMany({
        where: { restaurantId: session.restaurantId, acknowledgedAt: null },
        include: { table: { select: { number: true } } },
        orderBy: { createdAt: "asc" },
        take: 12,
      }),
    ]);

    const calls: CallRow[] = openCalls.map((call) => ({
      id: call.id,
      table: call.table.number,
      reason: call.reason,
      createdAt: call.createdAt.toISOString(),
    }));

    return (
      <>
        <PageHeader
          title="Orders"
          lede="Tickets move left to right. The guest's phone follows every step. Deliveries are on their own screen."
          action={<LiveUpdates />}
        />
        <div className="flex flex-col gap-6 px-5 py-6 sm:px-8">
          <WaiterCalls calls={calls} />
          {filters}

          {live.length === 0 ? (
            <Empty
              title="No open tickets"
              body="Anything a guest sends from a table lands here instantly, with the table number attached. Use the filters above to search past orders."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              {LANES.map((lane) => {
                const rows = live.filter((o) => o.stage === lane.stage);
                return (
                  <section key={lane.stage} className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-[0.8125rem] font-semibold text-ink">
                        {lane.label}
                      </h2>
                      <span className="num text-[0.6875rem] text-ink-3">
                        {rows.length}
                      </span>
                    </div>
                    {rows.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-[0.75rem] text-ink-3">
                        Empty
                      </p>
                    ) : (
                      rows.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={toCard(order)}
                          canCancel={canCancel}
                        />
                      ))
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </>
    );
  }

  // ------------------------------------------------------ Filtered search
  const where: Prisma.OrderWhereInput = {
    restaurantId: session.restaurantId,
    placedAt: { gte: range.from, lte: range.to },
    ...(params.stage ? { stage: params.stage as OrderStage } : {}),
    ...(params.channel
      ? { channel: params.channel as Prisma.OrderWhereInput["channel"] }
      : { channel: { not: "DELIVERY" as const } }),
    ...(query
      ? {
          OR: [
            { code: { contains: query } },
            { customerName: { contains: query } },
            { customerPhone: { contains: query } },
          ],
        }
      : {}),
  };

  const [total, rows, agg] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      include,
      orderBy: { placedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.order.aggregate({ where, _sum: { totalPaise: true } }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageLink = (n: number) => {
    const next = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v) as [string, string][],
    );
    next.set("page", String(n));
    return `/dashboard/orders?${next.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Orders"
        lede={`${total} orders · ${rupees(agg._sum.totalPaise ?? 0)} · ${range.label}`}
      />
      <div className="flex flex-col gap-6 px-5 py-6 sm:px-8">
        {filters}

        {rows.length === 0 ? (
          <Empty
            title="Nothing matches those filters"
            body="Widen the date range, or clear the filters to go back to the live queue."
          />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {rows.map((order) => (
                <OrderCard
                  key={order.id}
                  order={toCard(order)}
                  canCancel={canCancel && order.stage !== "SERVED"}
                />
              ))}
            </div>

            {pages > 1 ? (
              <nav className="flex items-center justify-between gap-3">
                <span className="num text-[0.75rem] text-ink-3">
                  Page {page} of {pages}
                </span>
                <div className="flex gap-2">
                  {page > 1 ? (
                    <Link
                      href={pageLink(page - 1)}
                      className="rounded-lg border border-line px-3 py-1.5 text-[0.8125rem] font-semibold text-ink transition hover:bg-surface-2"
                    >
                      Previous
                    </Link>
                  ) : null}
                  {page < pages ? (
                    <Link
                      href={pageLink(page + 1)}
                      className="rounded-lg border border-line px-3 py-1.5 text-[0.8125rem] font-semibold text-ink transition hover:bg-surface-2"
                    >
                      Next
                    </Link>
                  ) : null}
                </div>
              </nav>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
