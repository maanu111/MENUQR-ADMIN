import { PageHeader } from "@/components/app/Shell";
import { Empty } from "@/components/app/StatTile";
import { FlagToggle } from "@/components/app/FlagToggle";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { featureLabel } from "@/lib/feature-labels";

export const dynamic = "force-dynamic";

/* The switchable surface area. Anything not listed always ships. */
const KEYS = ["pos", "staff", "inventory", "offers", "reports.full"];

export default async function AdminFlagsPage() {
  await requireSuperAdmin();

  const restaurants = await db.restaurant.findMany({
    orderBy: { name: "asc" },
    include: {
      featureFlags: true,
      subscription: { include: { plan: { select: { name: true, features: true } } } },
    },
  });

  return (
    <>
      <PageHeader
        title="What each restaurant can use"
        lede="Switches follow the plan. Change one and it stays changed for that restaurant only — a highlighted switch is one you set by hand."
      />

      <div className="px-5 py-6 sm:px-8">
        {restaurants.length === 0 ? (
          <Empty
            title="No restaurants yet"
            body="Flags appear once there's a tenant to apply them to."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-ground">
            <table className="w-full min-w-[44rem] text-left">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-4 py-2.5 text-[0.6875rem] font-medium text-ink-3">
                    Restaurant
                  </th>
                  {KEYS.map((key) => (
                    <th
                      key={key}
                      className="px-3 py-2.5 text-[0.6875rem] font-medium text-ink-3"
                    >
                      {featureLabel(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {restaurants.map((restaurant) => {
                  const planFeatures = Array.isArray(
                    restaurant.subscription?.plan.features,
                  )
                    ? (restaurant.subscription!.plan.features as string[])
                    : [];

                  return (
                    <tr key={restaurant.id}>
                      <td className="px-4 py-3">
                        <span className="block text-[0.8125rem] font-medium text-ink">
                          {restaurant.name}
                        </span>
                        <span className="block text-[0.625rem] text-ink-3">
                          {restaurant.subscription?.plan.name ?? "no plan"}
                        </span>
                      </td>

                      {KEYS.map((key) => {
                        const override = restaurant.featureFlags.find(
                          (f) => f.key === key,
                        );
                        const enabled = override
                          ? override.enabled
                          : planFeatures.includes(key);
                        return (
                          <td key={key} className="px-3 py-3">
                            <FlagToggle
                              restaurantId={restaurant.id}
                              flagKey={key}
                              enabled={enabled}
                              overridden={Boolean(override)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
