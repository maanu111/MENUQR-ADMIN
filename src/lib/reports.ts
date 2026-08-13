import "server-only";
import { db } from "@/lib/db";
import type { Resolved } from "@/lib/range";

export type Bucket = { label: string; value: number };

/**
 * Revenue per bucket. Hourly for a single day, daily up to a quarter, monthly
 * beyond that — grouped in SQL so a busy year never ships row-by-row to Node.
 */
export async function revenueSeries(
  restaurantId: string,
  range: Resolved,
): Promise<Bucket[]> {
  const { from, to, granularity } = range;

  if (granularity === "hour") {
    const rows = await db.$queryRaw<{ bucket: number; total: bigint | number }[]>`
      SELECT HOUR(placedAt) AS bucket, SUM(totalPaise) AS total
      FROM \`Order\`
      WHERE restaurantId = ${restaurantId}
        AND placedAt BETWEEN ${from} AND ${to}
        AND stage <> 'CANCELLED'
      GROUP BY HOUR(placedAt)
    `;
    const byHour = new Map(rows.map((r) => [Number(r.bucket), Number(r.total)]));
    return Array.from({ length: 24 }, (_, hour) => ({
      label: `${String(hour).padStart(2, "0")}:00`,
      value: byHour.get(hour) ?? 0,
    }));
  }

  if (granularity === "month") {
    const rows = await db.$queryRaw<{ bucket: string; total: bigint | number }[]>`
      SELECT DATE_FORMAT(placedAt, '%Y-%m') AS bucket, SUM(totalPaise) AS total
      FROM \`Order\`
      WHERE restaurantId = ${restaurantId}
        AND placedAt BETWEEN ${from} AND ${to}
        AND stage <> 'CANCELLED'
      GROUP BY DATE_FORMAT(placedAt, '%Y-%m')
      ORDER BY bucket
    `;
    return rows.map((r) => {
      const [year, month] = String(r.bucket).split("-").map(Number);
      return {
        label: new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
          month: "short",
          year: "2-digit",
        }),
        value: Number(r.total),
      };
    });
  }

  const rows = await db.$queryRaw<{ bucket: Date; total: bigint | number }[]>`
    SELECT DATE(placedAt) AS bucket, SUM(totalPaise) AS total
    FROM \`Order\`
    WHERE restaurantId = ${restaurantId}
      AND placedAt BETWEEN ${from} AND ${to}
      AND stage <> 'CANCELLED'
    GROUP BY DATE(placedAt)
  `;

  const byDay = new Map(
    rows.map((r) => [new Date(r.bucket).toDateString(), Number(r.total)]),
  );

  const out: Bucket[] = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    out.push({
      label: cursor.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      value: byDay.get(cursor.toDateString()) ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export type ItemStat = {
  name: string;
  sold: number;
  revenuePaise: number;
  marginPaise: number;
};

export async function itemStats(
  restaurantId: string,
  range: Resolved,
): Promise<ItemStat[]> {
  const rows = await db.$queryRaw<
    {
      name: string;
      sold: bigint | number;
      revenue: bigint | number;
      margin: bigint | number;
    }[]
  >`
    SELECT oi.nameSnapshot AS name,
           SUM(oi.qty) AS sold,
           SUM(oi.qty * oi.unitPricePaise) AS revenue,
           SUM(oi.qty * (oi.unitPricePaise - oi.costPaise)) AS margin
    FROM OrderItem oi
    JOIN \`Order\` o ON o.id = oi.orderId
    WHERE o.restaurantId = ${restaurantId}
      AND o.placedAt BETWEEN ${range.from} AND ${range.to}
      AND o.stage <> 'CANCELLED'
    GROUP BY oi.nameSnapshot
    ORDER BY sold DESC
  `;

  return rows.map((r) => ({
    name: r.name,
    sold: Number(r.sold),
    revenuePaise: Number(r.revenue),
    marginPaise: Number(r.margin),
  }));
}

/** Revenue split by menu section — what the kitchen actually earns from. */
export async function categorySplit(restaurantId: string, range: Resolved) {
  const rows = await db.$queryRaw<{ name: string; revenue: bigint | number }[]>`
    SELECT c.name AS name, SUM(oi.qty * oi.unitPricePaise) AS revenue
    FROM OrderItem oi
    JOIN \`Order\` o ON o.id = oi.orderId
    JOIN MenuItem m ON m.id = oi.menuItemId
    JOIN Category c ON c.id = m.categoryId
    WHERE o.restaurantId = ${restaurantId}
      AND o.placedAt BETWEEN ${range.from} AND ${range.to}
      AND o.stage <> 'CANCELLED'
    GROUP BY c.name
    ORDER BY revenue DESC
  `;
  return rows.map((r) => ({ name: r.name, value: Number(r.revenue) }));
}

/** Where the orders came in from — QR, counter, phone. */
export async function channelSplit(restaurantId: string, range: Resolved) {
  const rows = await db.order.groupBy({
    by: ["channel"],
    where: {
      restaurantId,
      placedAt: { gte: range.from, lte: range.to },
      stage: { not: "CANCELLED" },
    },
    _count: true,
  });
  const LABEL: Record<string, string> = {
    QR: "Table QR",
    POS: "Counter",
    PHONE: "Phone",
  };
  return rows.map((r) => ({ name: LABEL[r.channel] ?? r.channel, value: r._count }));
}

/** Scans vs orders per hour — how many lookers turn into buyers. */
export async function scansByHour(restaurantId: string, range: Resolved) {
  const rows = await db.$queryRaw<{ bucket: number; count: bigint | number }[]>`
    SELECT HOUR(scannedAt) AS bucket, COUNT(*) AS count
    FROM QrScan
    WHERE restaurantId = ${restaurantId}
      AND scannedAt BETWEEN ${range.from} AND ${range.to}
    GROUP BY HOUR(scannedAt)
  `;
  const byHour = new Map(rows.map((r) => [Number(r.bucket), Number(r.count)]));
  return Array.from({ length: 24 }, (_, hour) => ({
    label: `${String(hour).padStart(2, "0")}`,
    value: byHour.get(hour) ?? 0,
  }));
}

export async function totals(restaurantId: string, range: Resolved) {
  const [agg, scans, cancelled] = await Promise.all([
    db.order.aggregate({
      where: {
        restaurantId,
        placedAt: { gte: range.from, lte: range.to },
        stage: { not: "CANCELLED" },
      },
      _sum: { totalPaise: true, guests: true },
      _count: true,
    }),
    db.qrScan.count({
      where: { restaurantId, scannedAt: { gte: range.from, lte: range.to } },
    }),
    db.order.count({
      where: {
        restaurantId,
        placedAt: { gte: range.from, lte: range.to },
        stage: "CANCELLED",
      },
    }),
  ]);

  const orders = agg._count;
  const revenue = agg._sum.totalPaise ?? 0;
  const covers = agg._sum.guests ?? 0;

  return {
    orders,
    cancelled,
    revenuePaise: revenue,
    covers,
    scans,
    avgTicketPaise: orders === 0 ? 0 : Math.round(revenue / orders),
    perHeadPaise: covers === 0 ? 0 : Math.round(revenue / covers),
    /* Scans that became orders — the number that says whether the QR works. */
    conversion: scans === 0 ? 0 : Math.round((orders / scans) * 100),
  };
}
