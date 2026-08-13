import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/marketing/Wordmark";
import { SignOutButton } from "./SignOutButton";
import { NavLink } from "./NavLink";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export type NavItem = { href: string; label: string; icon: ReactNode };

/**
 * Shared chrome for both consoles: a fixed rail on desktop, a scrollable tab
 * strip on phones. The two surfaces differ only in the nav they're handed.
 */
export function Shell({
  nav,
  areaLabel,
  contextLabel,
  userName,
  children,
}: {
  nav: NavItem[];
  areaLabel: string;
  contextLabel: string;
  userName: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* ------------------------------------------------- Desktop rail */}
      <aside className="hidden w-60 shrink-0 border-r border-line lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:self-start">
        <div className="flex h-14 shrink-0 items-center border-b border-line px-5">
          <Link href="/" aria-label="Tablet, home">
            <Wordmark />
          </Link>
        </div>

        <div className="px-5 pt-5 pb-3">
          <p className="eyebrow text-ink-3">{areaLabel}</p>
          <p className="mt-1 truncate text-[0.875rem] font-semibold text-ink">
            {contextLabel}
          </p>
        </div>

        <nav className="no-bar flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-4">
          {nav.map((item) => (
            <NavLink key={item.href} href={item.href} icon={item.icon}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 flex-col gap-2 border-t border-line p-3">
          <ThemeToggle />
          <p className="truncate px-2 text-[0.75rem] text-ink-3">{userName}</p>
          <SignOutButton />
        </div>
      </aside>

      {/* --------------------------------------------------- Mobile bar */}
      <header className="sticky top-0 z-40 border-b border-line bg-ground/90 backdrop-blur-lg lg:hidden">
        <div className="flex h-14 items-center gap-3 px-4">
          <Link href="/" aria-label="Tablet, home">
            <Wordmark />
          </Link>
          <span className="min-w-0 flex-1 truncate text-right text-[0.75rem] text-ink-3">
            {contextLabel}
          </span>
          <ThemeToggle compact />
          <SignOutButton compact />
        </div>
        <nav className="no-bar flex gap-1 overflow-x-auto px-3 pb-2">
          {nav.map((item) => (
            <NavLink key={item.href} href={item.href} icon={item.icon} compact>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="min-w-0 flex-1 bg-surface">{children}</main>
    </div>
  );
}

/** Consistent heading block for every page inside the consoles. */
export function PageHeader({
  title,
  lede,
  action,
}: {
  title: string;
  lede?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-line bg-ground px-5 py-5 sm:px-8">
      <div>
        <h1 className="display text-[1.5rem]">{title}</h1>
        {lede ? <p className="mt-1 text-[0.8125rem] text-ink-2">{lede}</p> : null}
      </div>
      {action}
    </div>
  );
}
