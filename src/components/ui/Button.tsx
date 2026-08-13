import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const BASE =
  "inline-flex h-11 items-center justify-center gap-1.5 rounded-xl px-5 text-[0.875rem] font-semibold transition-[background-color,border-color,box-shadow,transform] outline-none focus-visible:ring-4 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand text-brand-ink shadow-[0_1px_2px_rgb(2_132_199/0.24)] hover:bg-brand-deep focus-visible:ring-brand/25",
  secondary:
    "border border-line bg-ground text-ink hover:border-line-strong hover:bg-surface focus-visible:ring-brand/15",
  ghost: "text-ink-2 hover:bg-surface hover:text-ink focus-visible:ring-brand/15",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
}) {
  return (
    <button {...props} className={`${BASE} ${VARIANTS[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${BASE} ${VARIANTS[variant]} ${className}`}>
      {children}
    </Link>
  );
}
