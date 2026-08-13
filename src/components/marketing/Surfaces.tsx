import { CardRail, RailItem, Section } from "./Section";

const SURFACES = [
  {
    role: "Guest",
    device: "Their phone",
    heading: "Scan, order, watch it cook",
    points: [
      "Menu with photos, veg marks, prep times",
      "Customise items and pick add-ons",
      "Head count captured at checkout",
      "Live order status, no refreshing",
      "Call a server without waving",
    ],
    accent: false,
  },
  {
    role: "Restaurant",
    device: "Counter & kitchen",
    heading: "Run the floor from one screen",
    points: [
      "Menu, categories and product codes",
      "A printable QR for every table",
      "POS for walk-ins and phone orders",
      "Online and offline orders, one queue",
      "Staff roles — manager, waiter, kitchen",
      "Offers, inventory and table map",
    ],
    accent: true,
  },
  {
    role: "Platform owner",
    device: "Super admin",
    heading: "Run every restaurant on it",
    points: [
      "Every restaurant and its subscription",
      "Plans, billing and renewals",
      "Feature flags per tenant",
      "User management and support queue",
      "Platform-wide analytics",
    ],
    accent: false,
  },
];

export function Surfaces() {
  return (
    <Section
      id="surfaces"
      label="How it works"
      title="The same order, seen three ways."
      lede="A guest taps send. It reaches the kitchen queue, the table map, the day's revenue and the platform's billing — with nobody re-typing anything."
    >
      <CardRail cols="sm:grid-cols-2 lg:grid-cols-3">
        {SURFACES.map((s) => (
          <RailItem key={s.role}>
            <article
              className={`flex h-full flex-col rounded-xl border bg-ground p-5 ${
                s.accent ? "border-brand" : "border-line"
              }`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className={`eyebrow ${s.accent ? "text-brand" : "text-ink-3"}`}>
                  {s.role}
                </span>
                <span className="text-[0.625rem] text-ink-3">{s.device}</span>
              </div>

              <h3 className="mt-3 text-[0.9375rem] leading-snug font-semibold text-ink">
                {s.heading}
              </h3>

              <ul className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
                {s.points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span
                      aria-hidden="true"
                      className={`mt-[0.4rem] size-1 shrink-0 rounded-full ${
                        s.accent ? "bg-brand" : "bg-ink-3"
                      }`}
                    />
                    <span className="text-[0.8125rem] leading-snug text-ink-2">{p}</span>
                  </li>
                ))}
              </ul>
            </article>
          </RailItem>
        ))}
      </CardRail>
    </Section>
  );
}
