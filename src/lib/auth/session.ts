import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { PlatformRole, StaffRole } from "@/generated/prisma";

export const SESSION_COOKIE = "tablet_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionUser = {
  /** User id. */
  sub: string;
  name: string;
  email: string;
  platformRole: PlatformRole;
  /** The restaurant this session is currently acting in, if any. */
  restaurantId?: string;
  restaurantSlug?: string;
  staffRole?: StaffRole;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or shorter than 32 characters — set it in .env",
    );
  }
  return new TextEncoder().encode(value);
}

export async function signSession(user: SessionUser) {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());
}

export async function readSession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionUser;
  } catch {
    /* Expired, tampered with, or signed by an older secret. */
    return null;
  }
}

export async function startSession(user: SessionUser) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return token ? readSession(token) : null;
}
