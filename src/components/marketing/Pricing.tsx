import { ButtonLink } from "@/components/ui/Button";
import { CardRail, RailItem, Section } from "./Section";
import { db } from "@/lib/db";
import { rupees } from "@/lib/money";

/** Feature keys are internal; this is what a restaurant owner reads. */
const FEATURE_LABELS: Record<string, string> = {
  menu: "Menu and categories",
  qr: "A printable QR for every table",
  orders: "Guest ordering from the table",
  kitchen: "Live kitchen queue",
  pos: "POS for walk-ins and phone orders",
  staff: "Staff accounts and roles",
  inventory: "Inventory with low-stock alerts",
  offers: "Offers and coupon codes",
  "reports.daily": "Daily sales report",
  "reports.full": "Full reports, margins and CSV export",
  api: "API access and webhooks",
  flags: "Per-outlet feature control",
};

export const dynamic = "force-dynamic";

/**
 * Reads live plans, so adding one in the super admin changes this page with
 * no deploy. Archived plans disappear from here but keep working for the
 * restaurants already on them.
 */
export async function Pricing() {
  const plans = await db.plan
    .findMany({
      where: { isArchived: false, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { pricePaise: "asc" }],
    })
    .catch(() => []);

  if (plans.length === 0) return null;

  /* The middle plan is the one most restaurants land on, so it leads. */
  const featuredIndex = plans.length >= 3 ? 1 : 0;

  return (
    <Section
      id="pricing"
      label="Pricing"
      title="Priced per outlet, not per order."
      lede="No commission on what your guests spend. 14 days free, and you can export your data on the way out."
    >
      <CardRail cols="sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan, index) => {
          const featured = index === featuredIndex;
          const features = Array.isArray(plan.features)
            ? (plan.features as string[])
            : [];
          const custom = plan.pricePaise === 0;

          return (
            <RailItem key={plan.id}>
              <div
                className={`flex h-full flex-col rounded-xl border bg-ground p-5 ${
                  featured ? "border-brand" : "border-line"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-[0.8125rem] font-semibold text-ink">
                    {plan.name}
                  </h3>
                  {featured ? (
                    <span className="eyebrow rounded-full bg-brand-wash px-2 py-0.5 text-[0.5rem] text-brand">
                      Most picked
                    </span>
                  ) : null}
                </div>

                {plan.blurb ? (
                  <p className="mt-1 text-xs text-ink-3">{plan.blurb}</p>
                ) : null}

                <p className="mt-4 flex items-baseline gap-1">
                  <span className="display text-3xl text-ink">
                    {custom ? "Custom" : rupees(plan.pricePaise)}
                  </span>
                  {custom ? null : (
                    <span className="num text-xs text-ink-3">/mo</span>
                  )}
                </p>

                <ButtonLink
                  href={`/auth?mode=register&plan=${plan.tier.toLowerCase()}`}
                  variant={featured ? "primary" : "secondary"}
                  className="mt-5 w-full"
                >
                  {custom ? "Talk to us" : "Buy plan"}
                </ButtonLink>

                <p className="num mt-4 border-t border-line pt-4 text-[0.6875rem] text-ink-3">
                  {plan.maxOutlets === 1
                    ? "1 outlet"
                    : `Up to ${plan.maxOutlets} outlets`}
                  {" · "}
                  {plan.maxTables >= 1000
                    ? "unlimited tables"
                    : `${plan.maxTables} tables`}
                </p>

                <ul className="mt-3 flex flex-col gap-2">
                  {features.map((key) => (
                    <li key={key} className="flex gap-2">
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
                        {FEATURE_LABELS[key] ?? key}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </RailItem>
          );
        })}
      </CardRail>
    </Section>
  );
}
