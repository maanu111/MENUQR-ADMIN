import Link from "next/link";
import { PageHeader } from "@/components/app/Shell";
import { Empty, StatGrid, StatTile } from "@/components/app/StatTile";
import { DonutChart, RevenueChart } from "@/components/app/Charts";
import { LiveUpdates } from "@/components/app/LiveUpdates";
import { requireRestaurant } from "@/lib/auth/guards";
import { entitlements } from "@/lib/entitlements";
import { db } from "@/lib/db";
import { resolveRange } from "@/lib/range";
import { channelSplit, revenueSeries, totals } from "@/lib/reports";
import { rupees } from "@/lib/money";

export const dynamic = "force-dynamic";

const LIVE_STAGES = ["PLACED", "ACCEPTED", "PREPARING", "READY"] as const;

const STAGE_TONE: Record<string, string> = {
  PLACED: "text-brand",
  ACCEPTED: "text-brand",
  PREPARING: "text-warn",
  READY: "text-good",
};

const LOCKED_NOTE: Record<string, string> = {
  pos: "POS isn't included on this plan.",
  staff: "Staff management isn't included on this plan.",
  inventory: "Inventory isn't included on this plan.",
  offers: "Offers aren't included on this plan.",
  "reports.full": "Full reports aren't included on this plan.",
};

export default async function DashboardOverview({
  searchParams,
}: {
  searchParams: Promise<{ locked?: string }>;
}) {
  const session = await requireRestaurant();
  const { locked } = await searchParams;

  const range = resolveRange({ range: "today" });

  const [summary, buckets, channels, liveOrders, tableCount, granted] =
    await Promise.all([
      totals(session.restaurantId, range),
      revenueSeries(session.restaurantId, range),
      channelSplit(session.restaurantId, range),
      db.order.findMany({
        where: {
          restaurantId: session.restaurantId,
          stage: { in: [...LIVE_STAGES] },
        },
        include: { table: { select: { number: true } } },
        orderBy: { placedAt: "asc" },
        take: 8,
      }),
      db.restaurantTable.count({
        where: { restaurantId: session.restaurantId, isActive: true },
      }),
      entitlements(session.restaurantId),
    ]);

  const canSeeReports = granted.has("reports.full");

  return (
    <>
      <PageHeader
        title="Today"
        lede="Everything that has happened since service opened."
        action={
          <div className="flex items-center gap-3">
            <LiveUpdates />
            <Link
              href="/dashboard/orders"
              className="rounded-lg border border-line bg-ground px-4 py-2 text-[0.8125rem] font-semibold text-ink transition hover:bg-surface-2"
            >
              Open order queue
            </Link>
          </div>
        }
      />

      <div className="flex flex-col gap-6 px-5 py-6 sm:px-8">
        {locked ? (
          <p className="rounded-xl border border-warn/30 bg-warn/5 px-4 py-3 text-[0.8125rem] text-ink">
            {LOCKED_NOTE[locked] ?? "That section isn't included on this plan."}{" "}
            Talk to us if you need it.
          </p>
        ) : null}

        <StatGrid>
          <StatTile
            label="Orders"
            value={String(summary.orders)}
            foot={`${summary.cancelled} cancelled`}
          />
          <StatTile
            label="Revenue"
            value={rupees(summary.revenuePaise)}
            foot={`avg ${rupees(summary.avgTicketPaise)}`}
          />
          <StatTile
            label="Covers"
            value={String(summary.covers)}
            foot={`${rupees(summary.perHeadPaise)} per head`}
          />
          <StatTile
            label="QR scans"
            value={String(summary.scans)}
            foot={`${summary.conversion}% ordered · ${tableCount} tables`}
          />
        </StatGrid>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="rounded-xl border border-line bg-ground p-5">
            <RevenueChart buckets={buckets} caption="Revenue by hour" height={190} />
          </div>
          <div className="rounded-xl border border-line bg-ground p-5">
            <DonutChart
              slices={channels}
              caption="Where orders came from"
              asMoney={false}
              height={190}
            />
          </div>
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-[0.9375rem] font-semibold text-ink">In the kitchen</h2>
            <span className="num text-[0.6875rem] text-ink-3">
              {liveOrders.length} open
            </span>
          </div>

          {liveOrders.length === 0 ? (
            <Empty
              title="Nothing cooking"
              body="Open orders appear here the moment a guest sends one from their table."
            />
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-ground">
              {liveOrders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/dashboard/orders/${order.id}`}
                    className="flex items-center gap-4 px-4 py-3 transition hover:bg-surface-2"
                  >
                    <span className="num w-16 shrink-0 text-[0.8125rem] font-semibold text-ink">
                      {order.code}
                    </span>
                    <span className="num w-16 shrink-0 text-[0.75rem] text-ink-2">
                      {order.table ? `T${order.table.number}` : order.channel}
                    </span>
                    <span
                      className={`flex-1 text-[0.75rem] font-medium ${
                        STAGE_TONE[order.stage] ?? "text-ink-2"
                      }`}
                    >
                      {order.stage.toLowerCase()}
                    </span>
                    <span className="num shrink-0 text-[0.8125rem] text-ink">
                      {rupees(order.totalPaise)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {canSeeReports ? (
          <Link
            href="/dashboard/reports?range=30d"
            className="text-[0.8125rem] font-medium text-brand hover:underline"
          >
            See the last 30 days →
          </Link>
        ) : null}
      </div>
    </>
  );
}
