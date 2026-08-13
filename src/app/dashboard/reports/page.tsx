import { PageHeader } from "@/components/app/Shell";
import { Empty, StatGrid, StatTile } from "@/components/app/StatTile";
import { FilterBar } from "@/components/app/FilterBar";
import { DonutChart, RankChart, RevenueChart } from "@/components/app/Charts";
import { requirePage } from "@/lib/auth/guards";
import { resolveRange } from "@/lib/range";
import {
  categorySplit,
  channelSplit,
  itemStats,
  revenueSeries,
  scansByHour,
  totals,
} from "@/lib/reports";
import { rupees } from "@/lib/money";

export const dynamic = "force-dynamic";

function ItemTable({
  title,
  note,
  rows,
}: {
  title: string;
  note: string;
  rows: { name: string; sold: number; revenuePaise: number; marginPaise: number }[];
}) {
  const max = Math.max(...rows.map((r) => r.sold), 1);

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-[0.8125rem] font-semibold text-ink">{title}</h2>
        <span className="text-[0.6875rem] text-ink-3">{note}</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-ground">
        <table className="w-full min-w-104 text-left">
          <thead>
            <tr className="border-b border-line">
              {["Dish", "Sold", "Revenue", "Margin"].map((h) => (
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
            {rows.map((row) => (
              <tr key={row.name} className="transition hover:bg-surface-2">
                <td className="px-4 py-2.5">
                  <span className="block truncate text-[0.8125rem] text-ink">
                    {row.name}
                  </span>
                  <span className="mt-1 block h-1 w-full max-w-32 overflow-hidden rounded-full bg-surface-2">
                    <span
                      className="block h-full rounded-full bg-brand"
                      style={{ width: `${(row.sold / max) * 100}%` }}
                    />
                  </span>
                </td>
                <td className="num px-4 py-2.5 text-[0.8125rem] text-ink">{row.sold}</td>
                <td className="num px-4 py-2.5 text-[0.8125rem] text-ink-2">
                  {rupees(row.revenuePaise)}
                </td>
                <td className="num px-4 py-2.5 text-[0.8125rem] text-good">
                  {rupees(row.marginPaise)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const { session } = await requirePage("reports");

  const params = await searchParams;
  const range = resolveRange(params);

  const [summary, buckets, items, categories, channels, scans] = await Promise.all([
    totals(session.restaurantId, range),
    revenueSeries(session.restaurantId, range),
    itemStats(session.restaurantId, range),
    categorySplit(session.restaurantId, range),
    channelSplit(session.restaurantId, range),
    scansByHour(session.restaurantId, range),
  ]);

  const totalMargin = items.reduce((sum, i) => sum + i.marginPaise, 0);
  const marginPercent =
    summary.revenuePaise === 0
      ? 0
      : Math.round((totalMargin / summary.revenuePaise) * 100);

  const caption =
    range.granularity === "hour"
      ? "Revenue by hour"
      : range.granularity === "day"
        ? "Revenue by day"
        : "Revenue by month";

  return (
    <>
      <PageHeader title="Reports" lede={range.label} />

      <div className="flex flex-col gap-6 px-5 py-6 sm:px-8">
        <FilterBar exportPath="/api/export/reports" />

        <StatGrid>
          <StatTile label="Orders" value={String(summary.orders)} foot={`${summary.cancelled} cancelled`} />
          <StatTile label="Revenue" value={rupees(summary.revenuePaise)} foot="net of cancellations" />
          <StatTile
            label="Avg ticket"
            value={rupees(summary.avgTicketPaise)}
            foot={`${rupees(summary.perHeadPaise)} per head`}
          />
          <StatTile
            label="Margin"
            value={rupees(totalMargin)}
            foot={`${marginPercent}% of revenue`}
            tone={marginPercent >= 50 ? "good" : "warn"}
          />
        </StatGrid>

        <div className="rounded-xl border border-line bg-ground p-5">
          <RevenueChart buckets={buckets} caption={caption} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-line bg-ground p-5">
            <DonutChart slices={categories} caption="Revenue by section" />
          </div>
          <div className="rounded-xl border border-line bg-ground p-5">
            <DonutChart slices={channels} caption="Orders by channel" asMoney={false} />
          </div>
          <div className="rounded-xl border border-line bg-ground p-5">
            <RankChart
              caption="Top dishes by margin"
              asMoney
              rows={[...items]
                .sort((a, b) => b.marginPaise - a.marginPaise)
                .slice(0, 6)
                .map((i) => ({ name: i.name, value: i.marginPaise }))}
            />
          </div>
        </div>

        <div className="rounded-xl border border-line bg-ground p-5">
          <RevenueChart
            buckets={scans}
            caption="QR scans by hour"
            height={160}
          />
          <p className="num mt-2 text-[0.6875rem] text-ink-3">
            {summary.scans} scans · {summary.orders} orders ·{" "}
            {summary.conversion}% became an order
          </p>
        </div>

        {items.length === 0 ? (
          <Empty
            title="No sales in this period"
            body="Widen the date range, or wait for the first order of the day."
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            <ItemTable title="Selling fastest" note="by units sold" rows={items.slice(0, 8)} />
            <ItemTable
              title="Barely moving"
              note="candidates to cut"
              rows={[...items].reverse().slice(0, 8)}
            />
          </div>
        )}
      </div>
    </>
  );
}
