import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { startSession } from "@/lib/auth/session";
import { firstIssue, loginSchema } from "@/lib/validation";

/* Same message for unknown email and wrong password — never confirm which. */
const REJECT = { field: "password", message: "Email or password is wrong." };

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    const { field, message } = firstIssue(parsed.error);
    return NextResponse.json({ field, message }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const user = await db.user.findUnique({
    where: { email },
    include: {
      memberships: {
        where: { isActive: true },
        include: { restaurant: { select: { id: true, slug: true } } },
        orderBy: { invitedAt: "asc" },
        take: 1,
      },
    },
  });

  if (!user || !user.isActive) {
    return NextResponse.json(REJECT, { status: 401 });
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json(REJECT, { status: 401 });
  }

  const seat = user.memberships[0];

  /* Taking someone off the staff list is what revokes their login. Without
     this they'd authenticate and then bounce off every guarded page. */
  if (user.platformRole !== "SUPER_ADMIN" && !seat) {
    return NextResponse.json(
      {
        field: "email",
        message:
          "That account no longer has access to a restaurant. Ask the owner to add you back.",
      },
      { status: 403 },
    );
  }

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await startSession({
    sub: user.id,
    name: user.name,
    email: user.email,
    platformRole: user.platformRole,
    restaurantId: seat?.restaurant.id,
    restaurantSlug: seat?.restaurant.slug,
    staffRole: seat?.role,
  });

  return NextResponse.json({
    redirect: user.platformRole === "SUPER_ADMIN" ? "/admin" : "/dashboard",
  });
}
