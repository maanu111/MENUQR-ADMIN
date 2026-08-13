/**
 * Everything a plan can unlock. Order is what the pricing page renders.
 *
 * This lives outside the "use server" action file on purpose: a server-action
 * module may only export async functions, and exporting a constant from one
 * makes every action in that file throw at call time.
 */
export const FEATURE_KEYS = [
  "menu",
  "qr",
  "orders",
  "kitchen",
  "pos",
  "staff",
  "inventory",
  "offers",
  "reports.daily",
  "reports.full",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];
