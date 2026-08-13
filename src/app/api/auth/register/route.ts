import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { startSession } from "@/lib/auth/session";
import { PLAN_DEFAULTS, tierFromQuery } from "@/lib/plans";
import { firstIssue, registerSchema, slugify } from "@/lib/validation";

/** Slugs are public URLs, so collisions get a short random suffix. */
async function uniqueSlug(name: string) {
  const base = slugify(name) || "restaurant";
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${randomBytes(2).toString("hex")}`;
    const taken = await db.restaurant.findUnique({ where: { slug } });
    if (!taken) return slug;
  }
  return `${base}-${randomBytes(4).toString("hex")}`;
}

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    const { field, message } = firstIssue(parsed.error);
    return NextResponse.json({ field, message }, { status: 400 });
  }

  const { outlet, owner, email, phone, password, plan } = parsed.data;

  const clash = await db.user.findFirst({
    where: { OR: [{ email }, { phone }] },
    select: { email: true },
  });
  if (clash) {
    return NextResponse.json(
      {
        field: clash.email === email ? "email" : "phone",
        message: "An account already uses that — try signing in instead.",
      },
      { status: 409 },
    );
  }

  const tier = tierFromQuery(plan);
  const defaults = PLAN_DEFAULTS[tier];
  const slug = await uniqueSlug(outlet);
  const passwordHash = await hashPassword(password);

  const created = await db.$transaction(async (tx) => {
    const planRow = await tx.plan.upsert({
      where: { tier },
      update: {},
      create: {
        tier,
        name: defaults.name,
        pricePaise: defaults.pricePaise,
        maxOutlets: defaults.maxOutlets,
        maxTables: defaults.maxTables,
        features: defaults.features,
      },
    });

    const user = await tx.user.create({
      data: { email, phone, name: owner, passwordHash },
    });

    const restaurant = await tx.restaurant.create({
      data: {
        slug,
        name: outlet,
        subscription: {
          create: {
            planId: planRow.id,
            status: "TRIALING",
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        },
        memberships: {
          create: { userId: user.id, role: "OWNER", acceptedAt: new Date() },
        },
        /* A new restaurant with zero tables can't do anything, so seed four. */
        tables: {
          create: Array.from({ length: 4 }, (_, i) => ({
            number: String(i + 1),
            seats: 4,
            qrToken: randomBytes(4).toString("hex").toUpperCase(),
          })),
        },
      },
    });

    return { user, restaurant };
  });

  await startSession({
    sub: created.user.id,
    name: created.user.name,
    email: created.user.email,
    platformRole: created.user.platformRole,
    restaurantId: created.restaurant.id,
    restaurantSlug: created.restaurant.slug,
    staffRole: "OWNER",
  });

  return NextResponse.json({ redirect: "/dashboard" }, { status: 201 });
}
