import { PageHeader } from "@/components/app/Shell";
import { Empty, StatGrid, StatTile } from "@/components/app/StatTile";
import { FilterBar } from "@/components/app/FilterBar";
import { LiveUpdates } from "@/components/app/LiveUpdates";
import { DeliveryCard } from "@/components/app/DeliveryCard";
import { requirePage } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { resolveRange } from "@/lib/range";
import { rupees } from "@/lib/money";
import type { OrderStage, Prisma } from "@/generated/prisma";

export const dynamic = "force-dynamic";

/* A delivery moves through fewer states than a table order: it is cooked,
   it goes out, it is done. "Ready" means a rider can pick it up. */
const LANES: { stage: OrderStage; label: string; hint: string }[] = [
  { stage: "PLACED", label: "New", hint: "Ring the guest and confirm" },
  { stage: "ACCEPTED", label: "Confirmed", hint: "Waiting on the kitchen" },
  { stage: "PREPARING", label: "Cooking", hint: "Being made now" },
  { stage: "READY", label: "Ready to go", hint: "Hand it to the rider" },
];

const STAGE_OPTIONS = [
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "SERVED",
  "CANCELLED",
].map((s) => ({ value: s, label: s.toLowerCase() }));

const PAGE_SIZE = 40;

export default async function DeliveryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { session, role } = await requirePage("delivery");
  const params = await searchParams;

  const filtering = Boolean(params.range || params.stage || params.q);
  const range = resolveRange(params);
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const query = (params.q ?? "").trim();
  const canCancel = role === "OWNER" || role === "MANAGER";

  const include = {
    items: {
      select: { id: true, nameSnapshot: true, qty: true, optionLabels: true },
    },
  } as const;

  const filters = (
    <FilterBar
      searchPlaceholder="Order code, name, phone or street"
      exportPath="/api/export/orders"
      selects={[{ name: "stage", label: "Stage", options: STAGE_OPTIONS }]}
    />
  );

  /* Every screen here is delivery-only. The dine-in queue is a separate page
     and neither ever shows the other's tickets. */
  const onlyDeliveries: Prisma.OrderWhereInput = {
    restaurantId: session.restaurantId,
    channel: "DELIVERY",
  };

  if (!filtering) {
    const [live, todayCount, todayValue] = await Promise.all([
      db.order.findMany({
        where: { ...onlyDeliveries, stage: { in: LANES.map((l) => l.stage) } },
        include,
        orderBy: { placedAt: "asc" },
      }),
      db.order.count({
        where: {
          ...onlyDeliveries,
          placedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      db.order.aggregate({
        where: {
          ...onlyDeliveries,
          stage: { not: "CANCELLED" },
          placedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        _sum: { totalPaise: true },
      }),
    ]);

    const out = live.filter((o) => o.stage === "READY").length;

    return (
      <>
        <PageHeader
          title="Delivery"
          lede="Orders going out to an address. You deliver these yourself — ring the guest on the number they left."
          action={<LiveUpdates />}
        />

        <div className="flex flex-col gap-6 px-5 py-6 sm:px-8">
          <StatGrid>
            <StatTile label="Open now" value={String(live.length)} foot="not yet sent" />
            <StatTile label="Ready to go" value={String(out)} foot="waiting on a rider" tone={out > 0 ? "warn" : undefined} />
            <StatTile label="Today" value={String(todayCount)} foot="orders taken" />
            <StatTile
              label="Today's value"
              value={rupees(todayValue._sum.totalPaise ?? 0)}
              foot="excluding cancelled"
            />
          </StatGrid>

          {filters}

          {live.length === 0 ? (
            <Empty
              title="No deliveries waiting"
              body="Orders placed for delivery land here the moment they are sent, with the address and a number to call. Use the filters above to look back over past deliveries."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              {LANES.map((lane) => {
                const rows = live.filter((o) => o.stage === lane.stage);
                return (
                  <section key={lane.stage} className="flex flex-col gap-3">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-[0.8125rem] font-semibold text-ink">
                          {lane.label}
                        </h2>
                        <span className="num text-[0.6875rem] text-ink-3">
                          {rows.length}
                        </span>
                      </div>
                      <p className="text-[0.6875rem] text-ink-3">{lane.hint}</p>
                    </div>
                    {rows.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-[0.75rem] text-ink-3">
                        Empty
                      </p>
                    ) : (
                      rows.map((order) => (
                        <DeliveryCard
                          key={order.id}
                          order={{
                            id: order.id,
                            code: order.code,
                            stage: order.stage,
                            totalPaise: order.totalPaise,
                            paymentStatus: order.paymentStatus,
                            placedAt: order.placedAt.toISOString(),
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
                          }}
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
    ...onlyDeliveries,
    placedAt: { gte: range.from, lte: range.to },
    ...(params.stage ? { stage: params.stage as OrderStage } : {}),
    ...(query
      ? {
          OR: [
            { code: { contains: query } },
            { customerName: { contains: query } },
            { customerPhone: { contains: query } },
            { customerAddress: { contains: query } },
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

  return (
    <>
      <PageHeader
        title="Delivery"
        lede={`${total} ${total === 1 ? "delivery" : "deliveries"} · ${rupees(agg._sum.totalPaise ?? 0)}`}
        action={<LiveUpdates />}
      />

      <div className="flex flex-col gap-6 px-5 py-6 sm:px-8">
        {filters}

        {rows.length === 0 ? (
          <Empty
            title="Nothing matches those filters"
            body="Try a wider date range, or search by the guest's name, number or street."
          />
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {rows.map((order) => (
                <DeliveryCard
                  key={order.id}
                  order={{
                    id: order.id,
                    code: order.code,
                    stage: order.stage,
                    totalPaise: order.totalPaise,
                    paymentStatus: order.paymentStatus,
                    placedAt: order.placedAt.toISOString(),
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
                  }}
                  canCancel={canCancel}
                />
              ))}
            </div>

            {pages > 1 ? (
              <p className="num text-center text-[0.75rem] text-ink-3">
                Page {page} of {pages}
              </p>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
