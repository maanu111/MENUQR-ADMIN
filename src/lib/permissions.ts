import "server-only";
import type { StaffRole } from "@/generated/prisma";

/** Every page a restaurant user can be given. Keys are stable — they're stored. */
export const PAGES = [
  { key: "overview", label: "Overview", href: "/dashboard", feature: null },
  { key: "orders", label: "Orders", href: "/dashboard/orders", feature: null },
  { key: "delivery", label: "Delivery", href: "/dashboard/delivery", feature: null },
  { key: "menu", label: "Menu", href: "/dashboard/menu", feature: null },
  { key: "tables", label: "Tables & QR", href: "/dashboard/tables", feature: null },
  { key: "branding", label: "Menu design", href: "/dashboard/branding", feature: null },
  { key: "banners", label: "Banners", href: "/dashboard/banners", feature: null },
  { key: "settings", label: "Restaurant", href: "/dashboard/settings", feature: null },
  { key: "pos", label: "POS", href: "/dashboard/pos", feature: "pos" },
  { key: "staff", label: "Staff", href: "/dashboard/staff", feature: "staff" },
  { key: "inventory", label: "Inventory", href: "/dashboard/inventory", feature: "inventory" },
  { key: "offers", label: "Offers", href: "/dashboard/offers", feature: "offers" },
  { key: "reports", label: "Reports", href: "/dashboard/reports", feature: "reports.full" },
  { key: "support", label: "Support", href: "/dashboard/support", feature: null },
  { key: "billing", label: "Billing", href: "/dashboard/billing", feature: null },
] as const;

export type PageKey = (typeof PAGES)[number]["key"];

/** What each role gets when the owner hasn't picked anything specific. */
export const ROLE_DEFAULTS: Record<StaffRole, PageKey[]> = {
  OWNER: PAGES.map((p) => p.key),
  MANAGER: [
    "overview",
    "orders",
    "delivery",
    "menu",
    "tables",
    "branding",
    "banners",
    "settings",
    "pos",
    "staff",
    "inventory",
    "offers",
    "reports",
    "support",
  ],
  WAITER: ["overview", "orders", "delivery", "pos", "tables"],
  KITCHEN: ["orders", "delivery"],
};

/** Only the owner may hold these, however the permissions are edited. */
const OWNER_ONLY: PageKey[] = ["billing"];

/**
 * The pages one person may open. An explicit list on the membership wins over
 * the role default — that's how an owner hands one waiter the reports page
 * without promoting them to manager.
 */
export function pagesFor(role: StaffRole, stored: unknown): Set<PageKey> {
  const valid = new Set(PAGES.map((p) => p.key) as readonly PageKey[]);

  let keys: PageKey[];
  if (Array.isArray(stored)) {
    keys = stored.filter((k): k is PageKey => valid.has(k as PageKey));
  } else {
    keys = [...ROLE_DEFAULTS[role]];
  }

  if (role !== "OWNER") {
    keys = keys.filter((k) => !OWNER_ONLY.includes(k));
  }
  /* Everyone keeps a landing page, or signing in dead-ends. */
  if (!keys.includes("overview") && !keys.includes("orders")) {
    keys.unshift("orders");
  }
  return new Set(keys);
}

/** Pages an owner is allowed to hand out for a given role. */
export function assignableFor(role: StaffRole) {
  return PAGES.filter((p) => role === "OWNER" || !OWNER_ONLY.includes(p.key));
}
