import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("That email doesn't look right");

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(200, "That password is too long");

/** Indian mobile: 10 digits starting 6–9. */
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s+/g, ""))
  .refine((v) => /^[6-9]\d{9}$/.test(v), "Enter a 10-digit mobile number");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});

export const registerSchema = z.object({
  outlet: z.string().trim().min(2, "Tell us the restaurant's name").max(80),
  owner: z.string().trim().min(2, "Tell us your name").max(80),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  plan: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

/** Turns a Zod failure into the one message and field the form should show. */
export function firstIssue(error: z.ZodError) {
  const issue = error.issues[0];
  return {
    field: String(issue?.path?.[0] ?? ""),
    message: issue?.message ?? "Something in that form isn't right",
  };
}

/**
 * Reads a text field out of server-action input.
 *
 * Actions are a public boundary — the argument list is whatever the caller
 * sent, not whatever TypeScript promised — so a missing or wrong-typed field
 * has to come back as a validation message rather than a 500.
 */
export function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function slugify(value: string) {
  if (typeof value !== "string") return "";
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
