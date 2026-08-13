import Link from "next/link";
import { PageHeader } from "@/components/app/Shell";
import { Empty } from "@/components/app/StatTile";
import { FilterBar } from "@/components/app/FilterBar";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { rupees } from "@/lib/money";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, string> = {
  ACTIVE: "text-good",
  TRIALING: "text-brand",
  PAST_DUE: "text-warn",
  CANCELLED: "text-ink-3",
};

export default async function AdminRestaurantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireSuperAdmin();
  const params = await searchParams;
  const query = (params.q ?? "").trim();

  const restaurants = await db.restaurant.findMany({
    where: {
      ...(query
        ? {
            OR: [
              { name: { contains: query } },
              { slug: { contains: query } },
            ],
          }
        : {}),
      ...(params.status
        ? { subscription: { status: params.status as "ACTIVE" } }
        : {}),
      ...(params.plan
        ? { subscription: { plan: { tier: params.plan } } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      subscription: { include: { plan: { select: { name: true, pricePaise: true } } } },
      _count: { select: { orders: true, tables: true, memberships: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Restaurants"
        lede={`${restaurants.length} on the platform`}
      />

      <div className="flex flex-col gap-5 px-5 py-6 sm:px-8">
        <FilterBar
          showRange={false}
          searchPlaceholder="Restaurant name or slug"
          selects={[
            {
              name: "status",
              label: "Subscription",
              options: [
                { value: "ACTIVE", label: "Active" },
                { value: "TRIALING", label: "Trialing" },
                { value: "PAST_DUE", label: "Past due" },
                { value: "CANCELLED", label: "Cancelled" },
              ],
            },
            {
              name: "plan",
              label: "Plan",
              options: [
                { value: "STARTER", label: "Starter" },
                { value: "GROWTH", label: "Growth" },
                { value: "CHAIN", label: "Chain" },
              ],
            },
          ]}
        />
        {restaurants.length === 0 ? (
          <Empty
            title={query ? "Nothing matches that" : "No restaurants yet"}
            body={
              query
                ? "Try a shorter search, or clear it to see everyone."
                : "Sign-ups from the landing page appear here immediately."
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-ground">
            <table className="w-full min-w-[42rem] text-left">
              <thead>
                <tr className="border-b border-line">
                  {["Restaurant", "Plan", "Status", "Staff", "Tables", "Orders"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-[0.6875rem] font-medium text-ink-3"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {restaurants.map((r) => (
                  <tr
                    key={r.id}
                    className="row cursor-pointer transition hover:bg-surface-2"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/restaurants/${r.id}`}
                        className="row-link text-[0.8125rem] font-medium text-ink hover:text-brand"
                      >
                        {r.name}
                      </Link>
                      <span className="num block text-[0.6875rem] text-ink-3">
                        /{r.slug}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[0.8125rem] text-ink-2">
                      {r.subscription?.plan.name ?? "—"}
                      {r.subscription ? (
                        <span className="num block text-[0.625rem] text-ink-3">
                          {r.subscription.plan.pricePaise === 0
                            ? "custom"
                            : `${rupees(r.subscription.plan.pricePaise)}/mo`}
                        </span>
                      ) : null}
                    </td>
                    <td
                      className={`px-4 py-3 text-[0.75rem] font-medium ${
                        STATUS_TONE[r.subscription?.status ?? ""] ?? "text-ink-3"
                      }`}
                    >
                      {r.subscription?.status.toLowerCase() ?? "none"}
                    </td>
                    <td className="num px-4 py-3 text-[0.8125rem] text-ink-2">
                      {r._count.memberships}
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
      </div>
    </>
  );
}
