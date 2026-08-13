import "server-only";
import bcrypt from "bcryptjs";

/* 12 rounds: comfortably slow for an attacker, unnoticeable on a login. */
const ROUNDS = 12;

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
