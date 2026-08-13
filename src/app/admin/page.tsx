import Link from "next/link";
import { PageHeader } from "@/components/app/Shell";
import { Empty, StatGrid, StatTile } from "@/components/app/StatTile";
import { FilterBar } from "@/components/app/FilterBar";
import { DonutChart, RankChart, RevenueChart } from "@/components/app/Charts";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { resolveRange } from "@/lib/range";
import {
  collectionsSeries,
  gmvSeries,
  restaurantsByPlan,
  subscriptionsByStatus,
  topRestaurants,
} from "@/lib/platform-reports";
import { rupees } from "@/lib/money";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, string> = {
  ACTIVE: "text-good",
  TRIALING: "text-brand",
  PAST_DUE: "text-warn",
  CANCELLED: "text-ink-3",
};

export default async function AdminOverview({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  await requireSuperAdmin();
  const params = await searchParams;
  const range = resolveRange({ range: params.range ?? "30d", ...params });

  const [
    restaurants,
    trialing,
    pastDue,
    submitted,
    mrrRows,
    recent,
    orderAgg,
    gmv,
    collections,
    byPlan,
    byStatus,
    leaders,
  ] = await Promise.all([
    db.restaurant.count(),
    db.subscription.count({ where: { status: "TRIALING" } }),
    db.subscription.count({ where: { status: "PAST_DUE" } }),
    db.invoice.count({ where: { status: "SUBMITTED" } }),
    db.subscription.findMany({
      where: { status: "ACTIVE" },
      select: { plan: { select: { pricePaise: true } } },
    }),
    db.restaurant.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        subscription: { include: { plan: { select: { name: true } } } },
        _count: { select: { orders: true, tables: true } },
      },
    }),
    db.order.aggregate({
      where: {
        placedAt: { gte: range.from, lte: range.to },
        stage: { not: "CANCELLED" },
      },
      _sum: { totalPaise: true },
      _count: true,
    }),
    gmvSeries(range),
    collectionsSeries(resolveRange({ range: "year" })),
    restaurantsByPlan(),
    subscriptionsByStatus(),
    topRestaurants(range),
  ]);

  const mrr = mrrRows.reduce((sum, row) => sum + row.plan.pricePaise, 0);

  const caption =
    range.granularity === "hour"
      ? "What guests spent, by hour"
      : range.granularity === "day"
        ? "What guests spent, by day"
        : "What guests spent, by month";

  return (
    <>
      <PageHeader title="Platform" lede={range.label} />

      <div className="flex flex-col gap-6 px-5 py-6 sm:px-8">
        <FilterBar />

        <StatGrid>
          <StatTile
            label="Restaurants"
            value={String(restaurants)}
            foot="signed up in total"
          />
          <StatTile
            label="Monthly income"
            value={rupees(mrr)}
            foot="from paying restaurants"
          />
          <StatTile
            label="To verify"
            value={String(submitted)}
            foot={submitted > 0 ? "payments to check" : "nothing waiting"}
            tone={submitted > 0 ? "warn" : "good"}
          />
          <StatTile
            label="Past due"
            value={String(pastDue)}
            foot={pastDue > 0 ? "haven’t paid" : `${trialing} still on trial`}
            tone={pastDue > 0 ? "warn" : "good"}
          />
        </StatGrid>

        <div className="rounded-xl border border-line bg-ground p-5">
          <RevenueChart buckets={gmv} caption={caption} />
          <p className="num mt-2 text-[0.6875rem] text-ink-3">
            {orderAgg._count} orders · {rupees(orderAgg._sum.totalPaise ?? 0)}{" "}
            spent by guests across every restaurant
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-line bg-ground p-5">
            <DonutChart
              slices={byPlan}
              caption="Which plan they're on"
              asMoney={false}
            />
          </div>
          <div className="rounded-xl border border-line bg-ground p-5">
            <DonutChart
              slices={byStatus}
              caption="How their account stands"
              asMoney={false}
            />
          </div>
          <div className="rounded-xl border border-line bg-ground p-5">
            <RankChart caption="Busiest restaurants" asMoney rows={leaders} />
          </div>
        </div>

        {collections.length > 0 ? (
          <div className="rounded-xl border border-line bg-ground p-5">
            <RevenueChart
              buckets={collections}
              caption="What you collected, by month"
              height={180}
            />
          </div>
        ) : null}

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-[0.9375rem] font-semibold text-ink">
              Newest restaurants
            </h2>
            <Link
              href="/admin/restaurants"
              className="text-[0.75rem] font-medium text-brand hover:underline"
            >
              See all
            </Link>
          </div>

          {recent.length === 0 ? (
            <Empty
              title="No restaurants yet"
              body="Sign-ups from the landing page land here as soon as the first one comes in."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line bg-ground">
              <table className="w-full min-w-136 text-left">
                <thead>
                  <tr className="border-b border-line">
                    {["Restaurant", "Plan", "Status", "Tables", "Orders"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-[0.6875rem] font-medium text-ink-3"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {recent.map((r) => (
                    <tr key={r.id} className="transition hover:bg-surface-2">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/restaurants/${r.id}`}
                          className="text-[0.8125rem] font-medium text-ink hover:text-brand"
                        >
                          {r.name}
                        </Link>
                        <span className="num block text-[0.6875rem] text-ink-3">
                          /{r.slug}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[0.8125rem] text-ink-2">
                        {r.subscription?.plan.name ?? "—"}
                      </td>
                      <td
                        className={`px-4 py-3 text-[0.75rem] font-medium ${
                          STATUS_TONE[r.subscription?.status ?? ""] ?? "text-ink-3"
                        }`}
                      >
                        {r.subscription?.status.toLowerCase() ?? "none"}
                      </td>
                      <td className="num px-4 py-3 text-[0.8125rem] text-ink-2">
                        {r._count.tables}
                      </td>
                      <td className="num px-4 py-3 text-[0.8125rem] text-ink-2">
                        {r._count.orders}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
