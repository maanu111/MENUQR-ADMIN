import type { ReactNode } from "react";
import { Shell } from "@/components/app/Shell";
import { Toaster } from "@/components/ui/Toaster";
import { Icons } from "@/components/app/icons";
import { requireSuperAdmin } from "@/lib/auth/guards";

const NAV = [
  { href: "/admin", label: "Overview", icon: Icons.overview },
  { href: "/admin/restaurants", label: "Restaurants", icon: Icons.tenants },
  { href: "/admin/plans", label: "Plans", icon: Icons.plans },
  { href: "/admin/billing", label: "Billing", icon: Icons.billing },
  { href: "/admin/flags", label: "Feature flags", icon: Icons.flags },
  { href: "/admin/support", label: "Support", icon: Icons.support },
  { href: "/admin/settings/payment", label: "Payment setup", icon: Icons.settings },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireSuperAdmin();

  return (
    <Shell
      nav={NAV}
      areaLabel="super admin"
      contextLabel="Tablet platform"
      userName={session.name}
    >
      <Toaster>{children}</Toaster>
    </Shell>
  );
}
