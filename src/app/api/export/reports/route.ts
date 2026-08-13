import { requireRestaurant } from "@/lib/auth/guards";
import { requireFeature } from "@/lib/entitlements";
import { resolveRange } from "@/lib/range";
import { itemStats, revenueSeries, totals } from "@/lib/reports";
import { csvResponse, toCsv } from "@/lib/csv";

/** Same filters as the page, so what you export is what you were looking at. */
export async function GET(request: Request) {
  const session = await requireRestaurant(["OWNER", "MANAGER"]);
  await requireFeature(session.restaurantId, "reports.full");

  const url = new URL(request.url);
  const range = resolveRange({
    range: url.searchParams.get("range") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });

  const [summary, buckets, items] = await Promise.all([
    totals(session.restaurantId, range),
    revenueSeries(session.restaurantId, range),
    itemStats(session.restaurantId, range),
  ]);

  const money = (paise: number) => (paise / 100).toFixed(2);

  /* One file, three blocks — an owner opens this in Excel, not a parser. */
  const parts = [
    toCsv(
      ["Report", "Value"],
      [
        ["Period", range.label],
        ["From", range.from.toISOString()],
        ["To", range.to.toISOString()],
        ["Orders", summary.orders],
        ["Cancelled", summary.cancelled],
        ["Revenue (INR)", money(summary.revenuePaise)],
        ["Covers", summary.covers],
        ["Average ticket (INR)", money(summary.avgTicketPaise)],
        ["Spend per head (INR)", money(summary.perHeadPaise)],
        ["QR scans", summary.scans],
        ["Scan to order %", summary.conversion],
      ],
    ),
    toCsv(
      ["Bucket", "Revenue (INR)"],
      buckets.map((b) => [b.label, money(b.value)]),
    ),
    toCsv(
      ["Dish", "Units sold", "Revenue (INR)", "Margin (INR)"],
      items.map((i) => [
        i.name,
        i.sold,
        money(i.revenuePaise),
        money(i.marginPaise),
      ]),
    ),
  ];

  const stamp = range.from.toISOString().slice(0, 10);
  return csvResponse(`report-${stamp}.csv`, parts.join("\r\n\r\n"));
}
