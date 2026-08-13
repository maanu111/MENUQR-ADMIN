import { PageHeader } from "@/components/app/Shell";
import { StaffTable, type StaffRow } from "@/components/app/StaffTable";
import { FilterBar } from "@/components/app/FilterBar";
import { requirePage } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { assignableFor, pagesFor } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { session, role, granted } = await requirePage("staff");
  const params = await searchParams;
  const query = (params.q ?? "").trim();

  const memberships = await db.membership.findMany({
    where: {
      restaurantId: session.restaurantId,
      ...(params.role ? { role: params.role as "OWNER" } : {}),
      ...(params.status === "active" ? { isActive: true } : {}),
      ...(params.status === "removed" ? { isActive: false } : {}),
      ...(query
        ? {
            user: {
              OR: [
                { name: { contains: query } },
                { email: { contains: query } },
              ],
            },
          }
        : {}),
    },
    include: {
      user: { select: { name: true, email: true, lastLoginAt: true } },
    },
    orderBy: [{ role: "asc" }, { invitedAt: "asc" }],
  });

  const rows: StaffRow[] = memberships.map((m) => ({
    membershipId: m.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    isActive: m.isActive,
    lastLoginAt: m.user.lastLoginAt?.toISOString() ?? null,
    pages: [...pagesFor(m.role, m.pages)],
    usingDefaults: !Array.isArray(m.pages),
    /* A page the plan doesn't include is shown but not assignable. */
    options: assignableFor(m.role).map((page) => ({
      key: page.key,
      label: page.label,
      locked: Boolean(page.feature && !granted.has(page.feature)),
    })),
  }));

  const active = rows.filter((r) => r.isActive).length;

  return (
    <>
      <PageHeader
        title="Staff"
        lede={`${active} people can sign in · roles decide what each one sees`}
      />

      <div className="flex flex-col gap-5 px-5 py-6 sm:px-8">
        <FilterBar
          showRange={false}
          searchPlaceholder="Name or email"
          selects={[
            {
              name: "role",
              label: "Role",
              options: [
                { value: "OWNER", label: "Owner" },
                { value: "MANAGER", label: "Manager" },
                { value: "WAITER", label: "Waiter" },
                { value: "KITCHEN", label: "Kitchen" },
              ],
            },
            {
              name: "status",
              label: "Status",
              options: [
                { value: "active", label: "Can sign in" },
                { value: "removed", label: "Removed" },
              ],
            },
          ]}
        />
        <StaffTable rows={rows} canManageRoles={role === "OWNER"} />
      </div>
    </>
  );
}
