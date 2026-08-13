import { requireRestaurant } from "@/lib/auth/guards";
import { resolveRange } from "@/lib/range";
import { csvResponse, toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma";

export async function GET(request: Request) {
  const session = await requireRestaurant(["OWNER", "MANAGER"]);

  const url = new URL(request.url);
  const range = resolveRange({
    range: url.searchParams.get("range") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });
  const stage = url.searchParams.get("stage");
  const channel = url.searchParams.get("channel");
  const query = (url.searchParams.get("q") ?? "").trim();

  const where: Prisma.OrderWhereInput = {
    restaurantId: session.restaurantId,
    placedAt: { gte: range.from, lte: range.to },
    ...(stage ? { stage: stage as Prisma.EnumOrderStageFilter["equals"] } : {}),
    ...(channel
      ? { channel: channel as Prisma.EnumOrderChannelFilter["equals"] }
      : {}),
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

  const orders = await db.order.findMany({
    where,
    include: { table: { select: { number: true } }, items: true },
    orderBy: { placedAt: "asc" },
  });

  const money = (paise: number) => (paise / 100).toFixed(2);

  /* One row per order line — the shape an accountant can pivot. */
  const rows = orders.flatMap((order) =>
    order.items.map((item) => [
      order.code,
      order.placedAt.toISOString(),
      order.table?.number ?? "",
      order.channel,
      order.stage,
      order.paymentStatus,
      order.guests,
      order.customerName ?? "",
      order.customerPhone ?? "",
      item.nameSnapshot,
      item.qty,
      money(item.unitPricePaise),
      money(item.qty * item.unitPricePaise),
      money(item.qty * (item.unitPricePaise - item.costPaise)),
      money(order.totalPaise),
    ]),
  );

  const csv = toCsv(
    [
      "Order",
      "Placed at",
      "Table",
      "Channel",
      "Stage",
      "Payment",
      "Guests",
      "Customer",
      "Phone",
      "Item",
      "Qty",
      "Unit price (INR)",
      "Line total (INR)",
      "Line margin (INR)",
      "Order total (INR)",
    ],
    rows,
  );

  const stamp = range.from.toISOString().slice(0, 10);
  return csvResponse(`orders-${stamp}.csv`, csv);
}
