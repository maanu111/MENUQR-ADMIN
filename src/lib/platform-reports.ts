import "server-only";
import { db } from "@/lib/db";
import type { Resolved } from "@/lib/range";

/** Order value across every tenant — the volume the platform sits on. */
export async function gmvSeries(range: Resolved) {
  const { from, to, granularity } = range;

  if (granularity === "hour") {
    const rows = await db.$queryRaw<{ bucket: number; total: bigint | number }[]>`
      SELECT HOUR(placedAt) AS bucket, SUM(totalPaise) AS total
      FROM \`Order\`
      WHERE placedAt BETWEEN ${from} AND ${to} AND stage <> 'CANCELLED'
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
      WHERE placedAt BETWEEN ${from} AND ${to} AND stage <> 'CANCELLED'
      GROUP BY DATE_FORMAT(placedAt, '%Y-%m') ORDER BY bucket
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
    WHERE placedAt BETWEEN ${from} AND ${to} AND stage <> 'CANCELLED'
    GROUP BY DATE(placedAt)
  `;
  const byDay = new Map(
    rows.map((r) => [new Date(r.bucket).toDateString(), Number(r.total)]),
  );

  const out: { label: string; value: number }[] = [];
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

/** What the platform actually collected, by month. */
export async function collectionsSeries(range: Resolved) {
  const rows = await db.$queryRaw<{ bucket: string; total: bigint | number }[]>`
    SELECT DATE_FORMAT(paidAt, '%Y-%m') AS bucket, SUM(amountPaise) AS total
    FROM Invoice
    WHERE status = 'PAID' AND paidAt BETWEEN ${range.from} AND ${range.to}
    GROUP BY DATE_FORMAT(paidAt, '%Y-%m') ORDER BY bucket
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

export async function restaurantsByPlan() {
  const rows = await db.subscription.groupBy({
    by: ["planId"],
    _count: true,
  });
  const plans = await db.plan.findMany({ select: { id: true, name: true } });
  const byId = new Map(plans.map((p) => [p.id, p.name]));
  return rows.map((r) => ({
    name: byId.get(r.planId) ?? "Unknown",
    value: r._count,
  }));
}

export async function subscriptionsByStatus() {
  const rows = await db.subscription.groupBy({ by: ["status"], _count: true });
  const LABEL: Record<string, string> = {
    ACTIVE: "Active",
    TRIALING: "Trialing",
    PAST_DUE: "Past due",
    CANCELLED: "Cancelled",
  };
  return rows.map((r) => ({ name: LABEL[r.status] ?? r.status, value: r._count }));
}

/** Which tenants are actually using it — the churn early-warning list. */
export async function topRestaurants(range: Resolved, limit = 6) {
  const rows = await db.$queryRaw<
    { name: string; total: bigint | number }[]
  >`
    SELECT r.name AS name, SUM(o.totalPaise) AS total
    FROM \`Order\` o
    JOIN Restaurant r ON r.id = o.restaurantId
    WHERE o.placedAt BETWEEN ${range.from} AND ${range.to}
      AND o.stage <> 'CANCELLED'
    GROUP BY r.name
    ORDER BY total DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({ name: r.name, value: Number(r.total) }));
}
