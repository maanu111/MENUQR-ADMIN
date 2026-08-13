import { PageHeader } from "@/components/app/Shell";
import { PlanManager, type PlanRow } from "@/components/app/PlanEditor";
import { requireSuperAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  await requireSuperAdmin();

  const plans = await db.plan.findMany({
    orderBy: [{ isArchived: "asc" }, { sortOrder: "asc" }, { pricePaise: "asc" }],
    include: { _count: { select: { subscriptions: true } } },
  });

  const rows: PlanRow[] = plans.map((plan) => ({
    id: plan.id,
    tier: plan.tier,
    name: plan.name,
    blurb: plan.blurb,
    pricePaise: plan.pricePaise,
    maxOutlets: plan.maxOutlets,
    maxTables: plan.maxTables,
    features: Array.isArray(plan.features) ? (plan.features as string[]) : [],
    isArchived: plan.isArchived,
    sortOrder: plan.sortOrder,
    subscribers: plan._count.subscriptions,
  }));

  const live = rows.filter((r) => !r.isArchived).length;

  return (
    <>
      <PageHeader
        title="Plans"
        lede={`${live} on sale · what you tick here is what those restaurants can use`}
      />

      <div className="px-5 py-6 sm:px-8">
        <PlanManager plans={rows} />
      </div>
    </>
  );
}
