"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLink({
  href,
  icon,
  compact = false,
  children,
}: {
  href: string;
  icon: ReactNode;
  compact?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  /* Exact match for section roots, prefix match for their children. */
  const active =
    pathname === href || (href !== "/dashboard" && href !== "/admin" && pathname.startsWith(href));

  if (compact) {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.75rem] font-medium whitespace-nowrap transition ${
          active ? "bg-brand text-brand-ink" : "text-ink-2 hover:bg-surface-2"
        }`}
      >
        <span className="size-3.5 shrink-0">{icon}</span>
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[0.8125rem] font-medium transition ${
        active
          ? "bg-brand-wash text-brand"
          : "text-ink-2 hover:bg-surface-2 hover:text-ink"
      }`}
    >
      <span className="size-4 shrink-0">{icon}</span>
      {children}
    </Link>
  );
}
