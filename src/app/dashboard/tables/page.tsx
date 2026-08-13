import Link from "next/link";
import { PageHeader } from "@/components/app/Shell";
import { Empty } from "@/components/app/StatTile";
import { TableCard, type TableCardData } from "@/components/app/TableCard";
import { NewTableForm } from "@/components/app/NewTableForm";
import { FilterBar } from "@/components/app/FilterBar";
import { requirePage } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { qrSvg, restaurantUrl } from "@/lib/qr";
import { SharedQrCard } from "@/components/app/SharedQrCard";

export const dynamic = "force-dynamic";

export default async function TablesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { session } = await requirePage("tables");
  const params = await searchParams;
  const query = (params.q ?? "").trim();

  const restaurant = await db.restaurant.findUniqueOrThrow({
    where: { id: session.restaurantId },
    select: { slug: true, name: true },
  });

  const sharedUrl = restaurantUrl(restaurant.slug);
  const sharedQr = await qrSvg(sharedUrl);

  const rows = await db.restaurantTable.findMany({
    where: {
      restaurantId: session.restaurantId,
      ...(query
        ? {
            OR: [
              { number: { contains: query } },
              { section: { contains: query } },
              { qrToken: { contains: query.toUpperCase() } },
            ],
          }
        : {}),
      ...(params.status === "active" ? { isActive: true } : {}),
      ...(params.status === "retired" ? { isActive: false } : {}),
    },
    orderBy: [{ isActive: "desc" }, { number: "asc" }],
  });

  const tables: TableCardData[] = rows.map((row) => ({
    id: row.id,
    number: row.number,
    seats: row.seats,
    section: row.section,
    isActive: row.isActive,
  }));

  const live = tables.filter((t) => t.isActive).length;

  return (
    <>
      <PageHeader
        title="Tables & QR"
        lede={`${live} of ${tables.length} tables taking orders`}
        action={
          <Link
            href="/print/tables"
            className="rounded-lg border border-line bg-ground px-4 py-2 text-[0.8125rem] font-semibold text-ink transition hover:bg-surface-2"
          >
            Print the code
          </Link>
        }
      />

      <div className="flex flex-col gap-6 px-5 py-6 sm:px-8">
        <SharedQrCard
          qrSvg={sharedQr}
          url={sharedUrl}
          restaurantName={restaurant.name}
          tableCount={tables.filter((t) => t.isActive).length}
        />

        <NewTableForm />

        <FilterBar
          showRange={false}
          searchPlaceholder="Table number or section"
          selects={[
            {
              name: "status",
              label: "Status",
              options: [
                { value: "active", label: "Taking orders" },
                { value: "retired", label: "Retired" },
              ],
            },
          ]}
        />

        {tables.length === 0 ? (
          <Empty
            title="No tables yet"
            body="Add your tables so guests can say where they are sitting. There is one code for the whole restaurant — the guest picks their table when the menu opens."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tables.map((table) => (
              <TableCard key={table.id} table={table} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
