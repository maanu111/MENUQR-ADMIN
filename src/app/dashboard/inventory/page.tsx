import { PageHeader } from "@/components/app/Shell";
import { Empty } from "@/components/app/StatTile";
import { StockTable, type StockRow } from "@/components/app/StockTable";
import { FilterBar } from "@/components/app/FilterBar";
import { requirePage } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { session } = await requirePage("inventory");
  const params = await searchParams;
  const query = (params.q ?? "").trim();

  const rows = (await db.inventoryItem.findMany({
    where: {
      restaurantId: session.restaurantId,
      ...(query ? { name: { contains: query } } : {}),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, unit: true, quantity: true, lowAt: true },
  })) as StockRow[];

  const low = rows.filter((r) => r.quantity <= r.lowAt).length;

  return (
    <>
      <PageHeader
        title="Inventory"
        lede={
          rows.length === 0
            ? "Track what runs out before service does."
            : `${rows.length} ingredients · ${low} running low`
        }
      />

      <div className="flex flex-col gap-6 px-5 py-6 sm:px-8">
        <FilterBar showRange={false} searchPlaceholder="Ingredient name" />
        <StockTable rows={low > 0 && params.stock === "low" ? rows.filter((r) => r.quantity <= r.lowAt) : rows} />
        {rows.length === 0 ? (
          <Empty
            title="Nothing tracked yet"
            body="Add the ingredients that actually run out mid-service. Set a warning level and this page tells you before the kitchen does."
          />
        ) : null}
      </div>
    </>
  );
}
