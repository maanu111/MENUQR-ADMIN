/** Source of truth for what each tier costs and unlocks. */
export const PLAN_DEFAULTS: Record<
  string,
  {
    name: string;
    pricePaise: number;
    maxOutlets: number;
    maxTables: number;
    features: string[];
  }
> = {
  STARTER: {
    name: "Starter",
    pricePaise: 99900,
    maxOutlets: 1,
    maxTables: 15,
    features: ["menu", "qr", "orders", "kitchen", "reports.daily"],
  },
  GROWTH: {
    name: "Growth",
    pricePaise: 249900,
    maxOutlets: 3,
    maxTables: 1000,
    features: [
      "menu",
      "qr",
      "orders",
      "kitchen",
      "pos",
      "staff",
      "inventory",
      "offers",
      "reports.full",
    ],
  },
  CHAIN: {
    name: "Chain",
    pricePaise: 0,
    maxOutlets: 1000,
    maxTables: 100000,
    features: [
      "menu",
      "qr",
      "orders",
      "kitchen",
      "pos",
      "staff",
      "inventory",
      "offers",
      "reports.full",
    ],
  },
};

export function tierFromQuery(value?: string | null): string {
  const key = (value ?? "").toUpperCase();
  if (key === "GROWTH" || key === "CHAIN" || key === "STARTER") return key;
  return "STARTER";
}
