import Link from "next/link";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { Wordmark } from "@/components/marketing/Wordmark";

export const metadata = {
  title: "Sign in · Tablet",
  description: "Sign in to your restaurant dashboard, or create an account.",
};

const POINTS = [
  "Menu, QR codes and tables in one place",
  "Orders from the floor and the counter",
  "Reports that answer what to cook tomorrow",
];

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; plan?: string }>;
}) {
  const { mode, plan } = await searchParams;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="shell flex h-14 items-center">
          <Link href="/" aria-label="Tablet, home">
            <Wordmark />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 sm:py-14">
        <div className="grid w-full max-w-4xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex justify-center lg:justify-start">
            <AuthPanel
              initialMode={mode === "register" ? "register" : "signin"}
              plan={plan}
            />
          </div>

          {/* Quiet supporting column — hidden where it would compete for space. */}
          <aside className="hidden lg:block">
            <p className="eyebrow text-brand">Restaurant dashboard</p>
            <p className="display mt-3 text-[1.75rem]">
              One login for the whole floor.
            </p>
            <ul className="mt-6 flex flex-col gap-3 border-t border-line pt-6">
              {POINTS.map((p) => (
                <li key={p} className="flex gap-2.5">
                  <svg
                    viewBox="0 0 16 16"
                    className="mt-0.5 size-3.5 shrink-0 text-brand"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3.5 8.4 6.4 11.3 12.5 5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-[0.875rem] leading-snug text-ink-2">{p}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </main>
    </div>
  );
}
