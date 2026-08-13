import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "tablet_session";

/**
 * Cheap gate at the edge: is there a valid session at all, and does the
 * platform role match the area being entered. Fine-grained staff-role checks
 * stay in the server components, where the database is reachable.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  const signIn = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  };

  if (!token) return signIn();

  let payload: Record<string, unknown>;
  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    payload = (await jwtVerify(token, secret)).payload as Record<string, unknown>;
  } catch {
    /* Expired or tampered — clear it so they don't loop on a dead cookie. */
    const response = signIn();
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  const isSuperAdmin = payload.platformRole === "SUPER_ADMIN";

  if (pathname.startsWith("/admin") && !isSuperAdmin) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/print/:path*"],
};
