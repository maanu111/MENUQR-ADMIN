import "server-only";
import { redirect } from "next/navigation";
import { db } from "./db";

/** Capabilities that can be withheld. Everything else ships on every plan. */
export const GATED = [
  "pos",
  "staff",
  "inventory",
  "offers",
  "reports.full",
] as const;

export type Feature = (typeof GATED)[number];

/**
 * What a restaurant may actually use: whatever its plan grants, with any
 * per-tenant override from the super admin applied on top. An override row
 * always wins — that is the whole point of the kill switch.
 */
export async function entitlements(restaurantId: string): Promise<Set<string>> {
  const [subscription, flags] = await Promise.all([
    db.subscription.findUnique({
      where: { restaurantId },
      select: { status: true, plan: { select: { features: true } } },
    }),
    db.featureFlag.findMany({
      where: { restaurantId },
      select: { key: true, enabled: true },
    }),
  ]);

  const granted = new Set<string>(
    Array.isArray(subscription?.plan.features)
      ? (subscription.plan.features as string[])
      : [],
  );

  for (const flag of flags) {
    if (flag.enabled) granted.add(flag.key);
    else granted.delete(flag.key);
  }

  /* A cancelled account keeps the menu readable but loses the extras. */
  if (subscription?.status === "CANCELLED") {
    for (const key of GATED) granted.delete(key);
  }

  return granted;
}

/**
 * Guards a page. Typing the URL directly must fail the same way the hidden
 * nav item implies, otherwise the switch is decoration.
 */
export async function requireFeature(restaurantId: string, feature: Feature) {
  const granted = await entitlements(restaurantId);
  if (!granted.has(feature)) redirect("/dashboard?locked=" + feature);
}
