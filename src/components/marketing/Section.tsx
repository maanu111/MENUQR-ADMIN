import type { ReactNode } from "react";

/**
 * Section header runs inline: label and rule on one line, then the title and
 * its lede side by side rather than stacked. Sections are divided by a
 * hairline instead of alternating slabs, so the page stays one sheet.
 */
export function Section({
  id,
  label,
  title,
  lede,
  aside,
  children,
}: {
  id?: string;
  label: string;
  title: string;
  lede?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="border-t border-line py-12 sm:py-16">
      <div className="shell">
        <div className="flex items-center gap-3">
          <span className="eyebrow shrink-0 text-brand">{label}</span>
          <span aria-hidden="true" className="h-px flex-1 bg-line" />
          {aside}
        </div>

        <div className="mt-5 grid gap-x-10 gap-y-3 md:grid-cols-2 md:items-end">
          <h2 className="display text-[1.625rem] sm:text-[2rem]">{title}</h2>
          {lede ? (
            <p className="measure text-[0.9375rem] leading-relaxed text-ink-2 md:pb-1">
              {lede}
            </p>
          ) : null}
        </div>

        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

/**
 * Cards swipe horizontally with snap points on phones and become a grid from
 * the small breakpoint up. Bleeds to the screen edge so the next card peeks.
 */
export function CardRail({
  cols = "sm:grid-cols-2 lg:grid-cols-3",
  children,
}: {
  cols?: string;
  children: ReactNode;
}) {
  return (
    <ul
      className={`no-bar -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3.5 overflow-x-auto px-5 pb-1 [scroll-behavior:smooth] [overscroll-behavior-x:contain] sm:mx-0 sm:grid sm:gap-4 sm:overflow-visible sm:px-0 ${cols}`}
    >
      {children}
    </ul>
  );
}

export function RailItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <li
      className={`w-[78vw] max-w-[20rem] shrink-0 snap-start sm:w-auto sm:max-w-none ${className}`}
    >
      {children}
    </li>
  );
}
