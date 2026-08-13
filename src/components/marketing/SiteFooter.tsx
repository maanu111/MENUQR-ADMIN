import Link from "next/link";
import { Wordmark } from "./Wordmark";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "#surfaces", label: "How it works" },
      { href: "#reports", label: "Reports" },
      { href: "#platform", label: "Platform" },
      { href: "#pricing", label: "Pricing" },
    ],
  },
  {
    title: "Restaurants",
    links: [
      { href: "/auth", label: "Sign in" },
      { href: "/auth?mode=register", label: "Create account" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/support", label: "Support" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="shell py-10">
        {/* Brand sits on its own rail; link columns share the remaining width. */}
        <div className="flex flex-col gap-9 md:flex-row md:justify-between md:gap-12">
          <div className="md:max-w-[15rem]">
            <Wordmark />
            <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink-3">
              QR ordering and back office for restaurants that would rather cook
              than chase tables.
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="grid flex-1 grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 md:max-w-md"
          >
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="eyebrow text-ink-3">{col.title}</h3>
                <ul className="mt-3 flex flex-col gap-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-[0.8125rem] text-ink-2 transition-colors hover:text-brand"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

      </div>
    </footer>
  );
}
