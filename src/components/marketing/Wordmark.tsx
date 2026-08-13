/**
 * A table seen from above with a QR square on it — the product's premise in
 * one glyph. Drawn bare: no plate, no chip, no filled square behind it.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 24 24"
        className="size-6 shrink-0 text-brand"
        aria-hidden="true"
        fill="currentColor"
      >
        <rect x="3" y="3" width="7.5" height="7.5" rx="1.8" />
        <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.8" opacity="0.45" />
        <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8" opacity="0.45" />
        <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8" opacity="0.8" />
      </svg>
      <span className="display text-[1.25rem] tracking-[-0.04em] text-ink">
        Tablet
      </span>
    </span>
  );
}
