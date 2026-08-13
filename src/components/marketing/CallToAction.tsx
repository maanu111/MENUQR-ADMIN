import { ButtonLink } from "@/components/ui/Button";

export function CallToAction() {
  return (
    <section className="border-t border-line py-12 sm:py-16">
      <div className="shell">
        {/* Copy and action sit on one line from md up, never stacked. */}
        <div className="flex flex-col gap-6 rounded-xl border border-line bg-surface p-6 sm:p-8 md:flex-row md:items-center md:justify-between md:gap-10">
          <div>
            <h2 className="display text-[1.5rem] sm:text-[1.75rem]">
              Print one code. Put it on one table.
            </h2>
            <p className="measure mt-2.5 text-[0.9375rem] leading-relaxed text-ink-2">
              That&rsquo;s the whole pilot. Run it through one dinner service and
              you&rsquo;ll know by closing time.
            </p>
          </div>

          <ButtonLink
            href="/auth?mode=register"
            className="shrink-0 self-start px-6 md:self-auto"
          >
            Create account
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
