import { PageHeader } from "@/components/app/Shell";
import { Empty } from "@/components/app/StatTile";
import { PosTerminal, type PosItem } from "@/components/app/PosTerminal";
import { requirePage } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const { session } = await requirePage("pos");

  const [restaurant, rows, tables] = await Promise.all([
    db.restaurant.findUniqueOrThrow({
      where: { id: session.restaurantId },
      select: { gstPercent: true },
    }),
    db.menuItem.findMany({
      where: { restaurantId: session.restaurantId, isAvailable: true },
      orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
      select: {
        id: true,
        name: true,
        code: true,
        pricePaise: true,
        diet: true,
        category: { select: { name: true } },
      },
    }),
    db.restaurantTable.findMany({
      where: { restaurantId: session.restaurantId, isActive: true },
      orderBy: { number: "asc" },
      select: { id: true, number: true },
    }),
  ]);

  const items: PosItem[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    pricePaise: row.pricePaise,
    diet: row.diet,
    category: row.category.name,
  }));

  return (
    <>
      <PageHeader
        title="POS"
        lede="Walk-ins and phone orders. Goes into the same queue as QR orders."
      />

      <div className="px-5 py-6 sm:px-8">
        {items.length === 0 ? (
          <Empty
            title="No dishes available"
            body="Everything is either missing or marked sold out. Add dishes on the Menu page first."
          />
        ) : (
          <PosTerminal
            items={items}
            tables={tables}
            gstPercent={restaurant.gstPercent}
          />
        )}
      </div>
    </>
  );
}
