import { PageHeader } from "@/components/app/Shell";
import { Empty } from "@/components/app/StatTile";
import { OffersTable, type OfferRow } from "@/components/app/OffersTable";
import { FilterBar } from "@/components/app/FilterBar";
import { requirePage } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { session } = await requirePage("offers");
  const params = await searchParams;
  const query = (params.q ?? "").trim();

  const rows = (await db.offer.findMany({
    where: {
      restaurantId: session.restaurantId,
      ...(query ? { code: { contains: query.toUpperCase() } } : {}),
      ...(params.state === "live" ? { isActive: true } : {}),
      ...(params.state === "paused" ? { isActive: false } : {}),
      ...(params.kind ? { kind: params.kind as "PERCENT" | "FLAT" } : {}),
    },
    orderBy: [{ isActive: "desc" }, { code: "asc" }],
    select: {
      id: true,
      code: true,
      kind: true,
      value: true,
      minSpendPaise: true,
      isActive: true,
    },
  })) as OfferRow[];

  const live = rows.filter((r) => r.isActive).length;

  return (
    <>
      <PageHeader
        title="Offers"
        lede={
          rows.length === 0
            ? "Discount codes guests can apply at checkout."
            : `${live} live of ${rows.length}`
        }
      />

      <div className="flex flex-col gap-6 px-5 py-6 sm:px-8">
        <FilterBar
          showRange={false}
          searchPlaceholder="Offer code"
          selects={[
            {
              name: "state",
              label: "State",
              options: [
                { value: "live", label: "Live" },
                { value: "paused", label: "Paused" },
              ],
            },
            {
              name: "kind",
              label: "Type",
              options: [
                { value: "PERCENT", label: "% off" },
                { value: "FLAT", label: "₹ off" },
              ],
            },
          ]}
        />
        <OffersTable rows={rows} />
        {rows.length === 0 ? (
          <Empty
            title="No offers running"
            body="Create a code, hand it out, and pause it the moment it stops paying for itself."
          />
        ) : null}
      </div>
    </>
  );
}
