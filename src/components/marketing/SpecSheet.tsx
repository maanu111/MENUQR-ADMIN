import { CardRail, RailItem, Section } from "./Section";

const GROUPS = [
  {
    title: "Menu & ordering",
    items: [
      "Categories and nested sections",
      "Product codes per item",
      "Variants, add-ons and modifiers",
      "Out-of-stock in one tap",
      "Online and offline orders, one queue",
      "Built-in POS for the counter",
      "Table map with live status",
      "Printable QR per table",
    ],
  },
  {
    title: "Staff & access",
    items: [
      "Invite staff by phone or email",
      "Roles: manager, waiter, kitchen",
      "Permissions scoped per role",
      "Kitchen display with sound alerts",
      "Per-staff activity trail",
      "Shift-wise order attribution",
    ],
  },
  {
    title: "Money & stock",
    items: [
      "Offers, coupons and happy hours",
      "Inventory with low-stock alerts",
      "Item-level margin tracking",
      "GST-ready billing",
      "Daily cash and settlement view",
      "Subscription renewal and invoices",
    ],
  },
  {
    title: "Super admin",
    items: [
      "Every restaurant in one console",
      "Subscription plans and pricing",
      "Feature flags per tenant",
      "User management across tenants",
      "Support queue and impersonation",
      "Platform-wide revenue analytics",
      "Landing page content control",
    ],
  },
];

export function SpecSheet() {
  return (
    <Section
      id="platform"
      label="Platform"
      title="Everything a restaurant runs on."
      lede="No add-on marketplace, no per-feature upsell. The list below is what ships on every paid plan."
    >
      <CardRail cols="sm:grid-cols-2 lg:grid-cols-4">
        {GROUPS.map((group) => (
          <RailItem key={group.title}>
            <div className="h-full rounded-xl border border-line bg-ground p-5">
              <h3 className="border-b border-line pb-3 text-[0.8125rem] font-semibold text-ink">
                {group.title}
              </h3>
              <ul className="mt-3.5 flex flex-col gap-2">
                {group.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <svg
                      viewBox="0 0 16 16"
                      className="mt-[0.15rem] size-3 shrink-0 text-brand"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M3.5 8.4 6.4 11.3 12.5 5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="text-[0.8125rem] leading-snug text-ink-2">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </RailItem>
        ))}
      </CardRail>
    </Section>
  );
}
