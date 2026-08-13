import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/Shell";
import { StatGrid, StatTile } from "@/components/app/StatTile";
import { SubscriptionControl } from "@/components/app/SubscriptionControl";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { rupees } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function RestaurantDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;

  const restaurant = await db.restaurant.findUnique({
    where: { id },
    include: {
      subscription: { include: { plan: true } },
      memberships: {
        include: { user: { select: { name: true, email: true, lastLoginAt: true } } },
        orderBy: { role: "asc" },
      },
      _count: { select: { orders: true, tables: true, menuItems: true } },
    },
  });

  if (!restaurant) notFound();

  const revenue = await db.order.aggregate({
    where: { restaurantId: restaurant.id, stage: { not: "CANCELLED" } },
    _sum: { totalPaise: true },
  });

  return (
    <>
      <PageHeader
        title={restaurant.name}
        lede={`/${restaurant.slug} · created ${restaurant.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
        action={
          <Link
            href="/admin/restaurants"
            className="rounded-lg border border-line bg-ground px-4 py-2 text-[0.8125rem] font-semibold text-ink transition hover:bg-surface-2"
          >
            Back
          </Link>
        }
      />

      <div className="flex flex-col gap-6 px-5 py-6 sm:px-8">
        <StatGrid>
          <StatTile
            label="Lifetime revenue"
            value={rupees(revenue._sum.totalPaise ?? 0)}
            foot="their guests' spend"
          />
          <StatTile label="Orders" value={String(restaurant._count.orders)} />
          <StatTile label="Tables" value={String(restaurant._count.tables)} />
          <StatTile label="Dishes" value={String(restaurant._count.menuItems)} />
        </StatGrid>

        <section className="rounded-xl border border-line bg-ground p-5">
          <h2 className="text-[0.8125rem] font-semibold text-ink">Subscription</h2>
          {restaurant.subscription ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
              <p className="text-[0.8125rem] text-ink-2">
                {restaurant.subscription.plan.name} ·{" "}
                <span className="num">
                  {restaurant.subscription.plan.pricePaise === 0
                    ? "custom"
                    : `${rupees(restaurant.subscription.plan.pricePaise)}/mo`}
                </span>
              </p>
              <SubscriptionControl
                subscriptionId={restaurant.subscription.id}
                status={restaurant.subscription.status}
                canInvoice={restaurant.subscription.plan.pricePaise > 0}
              />
            </div>
          ) : (
            <p className="mt-2 text-[0.8125rem] text-ink-3">
              No plan attached to this restaurant.
            </p>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-[0.8125rem] font-semibold text-ink">People</h2>
          <div className="overflow-x-auto rounded-xl border border-line bg-ground">
            <table className="w-full min-w-[30rem] text-left">
              <thead>
                <tr className="border-b border-line">
                  {["Name", "Email", "Role", "Last seen"].map((h) => (
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
                {restaurant.memberships.map((m) => (
                  <tr key={m.id} className={m.isActive ? "" : "opacity-50"}>
                    <td className="px-4 py-3 text-[0.8125rem] text-ink">
                      {m.user.name}
                    </td>
                    <td className="px-4 py-3 text-[0.8125rem] text-ink-2">
                      {m.user.email}
                    </td>
                    <td className="px-4 py-3 text-[0.75rem] text-ink-2">
                      {m.role.toLowerCase()}
                    </td>
                    <td className="num px-4 py-3 text-[0.75rem] text-ink-3">
                      {m.user.lastLoginAt
                        ? m.user.lastLoginAt.toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })
                        : "never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
