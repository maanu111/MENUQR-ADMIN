import "server-only";
import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "./session";
import { db } from "@/lib/db";
import { entitlements } from "@/lib/entitlements";
import { PAGES, pagesFor, type PageKey } from "@/lib/permissions";
import type { StaffRole } from "@/generated/prisma";

/** Anything under /dashboard or /admin goes through one of these. */
export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/auth");
  return session;
}

export async function requireSuperAdmin(): Promise<SessionUser> {
  const session = await requireUser();
  if (session.platformRole !== "SUPER_ADMIN") redirect("/dashboard");
  return session;
}

/**
 * Guards a restaurant surface. Without a restaurant on the session there is
 * nothing to scope queries by, so we send them back to pick one.
 */
export async function requireRestaurant(
  allowed: StaffRole[] = ["OWNER", "MANAGER", "WAITER", "KITCHEN"],
): Promise<SessionUser & { restaurantId: string; staffRole: StaffRole }> {
  const session = await requireUser();

  if (session.platformRole === "SUPER_ADMIN" && !session.restaurantId) {
    redirect("/admin");
  }
  if (!session.restaurantId || !session.staffRole) {
    redirect("/auth");
  }
  if (!allowed.includes(session.staffRole)) {
    redirect("/dashboard");
  }

  return session as SessionUser & {
    restaurantId: string;
    staffRole: StaffRole;
  };
}

/* ------------------------------------------------------------ Page access */

/**
 * Reads the seat fresh on every request rather than trusting the cookie, so
 * an owner revoking a page takes effect on the staff member's next click
 * instead of whenever their session happens to expire.
 */
export async function currentSeat() {
  const session = await requireRestaurant();

  const membership = await db.membership.findUnique({
    where: {
      userId_restaurantId: {
        userId: session.sub,
        restaurantId: session.restaurantId,
      },
    },
    select: { role: true, pages: true, isActive: true },
  });

  if (!membership || !membership.isActive) redirect("/auth");

  const [allowed, granted] = await Promise.all([
    Promise.resolve(pagesFor(membership.role, membership.pages)),
    entitlements(session.restaurantId),
  ]);

  return { session, role: membership.role, allowed, granted };
}

/** Guards one page. Covers both the plan entitlement and the person's access. */
export async function requirePage(page: PageKey) {
  const seat = await currentSeat();
  const definition = PAGES.find((p) => p.key === page);

  if (definition?.feature && !seat.granted.has(definition.feature)) {
    redirect(`/dashboard?locked=${definition.feature}`);
  }
  if (!seat.allowed.has(page)) {
    redirect("/dashboard?denied=" + page);
  }
  return seat;
}
