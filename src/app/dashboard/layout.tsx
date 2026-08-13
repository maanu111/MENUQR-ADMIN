import type { ReactNode } from "react";
import { Shell } from "@/components/app/Shell";
import { Toaster } from "@/components/ui/Toaster";
import { Icons } from "@/components/app/icons";
import { currentSeat } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { PAGES, type PageKey } from "@/lib/permissions";

/* One glyph per page key, so the rail is built entirely from permissions. */
const ICONS: Record<PageKey, ReactNode> = {
  overview: Icons.overview,
  orders: Icons.orders,
  delivery: Icons.delivery,
  menu: Icons.menu,
  tables: Icons.tables,
  branding: Icons.branding,
  banners: Icons.banners,
  settings: Icons.shop,
  pos: Icons.pos,
  staff: Icons.staff,
  inventory: Icons.inventory,
  offers: Icons.offers,
  reports: Icons.reports,
  support: Icons.support,
  billing: Icons.billing,
};

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { session, role, allowed, granted } = await currentSeat();

  const restaurant = await db.restaurant.findUnique({
    where: { id: session.restaurantId },
    select: { name: true },
  });

  /* A row shows only if this person may open it AND the plan includes it. */
  const nav = PAGES.filter(
    (page) =>
      allowed.has(page.key) && (!page.feature || granted.has(page.feature)),
  ).map((page) => ({
    href: page.href,
    label: page.label,
    icon: ICONS[page.key],
  }));

  return (
    <Shell
      nav={nav}
      areaLabel={role.toLowerCase()}
      contextLabel={restaurant?.name ?? "Your restaurant"}
      userName={session.name}
    >
      <Toaster>{children}</Toaster>
    </Shell>
  );
}
