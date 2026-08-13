import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Wordmark } from "./Wordmark";

const LINKS = [
  { href: "#surfaces", label: "How it works" },
  { href: "#reports", label: "Reports" },
  { href: "#platform", label: "Platform" },
  { href: "#pricing", label: "Pricing" },
];

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ground/85 backdrop-blur-lg">
      <nav className="shell flex h-14 items-center gap-6">
        <Link href="/" className="shrink-0" aria-label="Tablet, home">
          <Wordmark />
        </Link>

        <ul className="hidden flex-1 items-center gap-6 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-[0.8125rem] text-ink-2 transition-colors hover:text-ink"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-1.5 md:ml-0">
          <ButtonLink href="/auth" variant="ghost" className="h-9 px-3 text-[0.8125rem]">
            Sign in
          </ButtonLink>
          <ButtonLink
            href="/auth?mode=register"
            className="h-9 px-3.5 text-[0.8125rem]"
          >
            Create account
          </ButtonLink>
        </div>
      </nav>
    </header>
  );
}
