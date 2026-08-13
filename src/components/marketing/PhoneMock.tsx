function Bar({ className }: { className?: string }) {
  return <span className={`skeleton block rounded-full ${className}`} />;
}

/**
 * The phone is caught mid-load on purpose: the hero's claim is how fast the
 * menu arrives, so showing it arriving says more than showing it arrived.
 * No dish names here — the real menu belongs to the restaurant, not to us.
 */
export function PhoneMock() {
  return (
    <div
      className="w-[12.5rem] shrink-0 rounded-[1.5rem] border-4 border-ink bg-ink sm:w-[13.5rem]"
      role="img"
      aria-label="A phone loading a restaurant's menu"
    >
      <div className="overflow-hidden rounded-[1.2rem] bg-white" aria-hidden="true">
        {/* App bar */}
        <div className="flex items-center gap-1.5 border-b border-line px-2.5 py-2">
          <span className="skeleton size-5 shrink-0 rounded" />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <Bar className="h-1.5 w-16" />
            <Bar className="h-1 w-8" />
          </span>
          <span className="skeleton size-3.5 shrink-0 rounded" />
        </div>

        {/* Category chips */}
        <div className="flex gap-1 px-2.5 py-2">
          <Bar className="h-3 w-10" />
          <Bar className="h-3 w-12" />
          <Bar className="h-3 w-9" />
        </div>

        {/* Dish rows */}
        <ul className="border-t border-line">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="flex items-start gap-2 border-b border-line px-2.5 py-2 last:border-b-0"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
                <Bar className="h-1.5 w-3" />
                <Bar className="h-2 w-20" />
                <Bar className="h-1.5 w-10" />
              </span>

              <span className="relative w-9 shrink-0 pb-1">
                <span className="skeleton block aspect-square w-full rounded" />
                <span className="absolute inset-x-0 bottom-0 flex justify-center">
                  <span className="skeleton h-3 w-9 rounded-full ring-[1.5px] ring-white" />
                </span>
              </span>
            </li>
          ))}
        </ul>

        {/* Bottom bar */}
        <div className="p-2">
          <Bar className="h-5 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
