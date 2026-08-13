import type { InputHTMLAttributes } from "react";

/**
 * One field shape for every form on the platform: same height, same radius,
 * same focus treatment — so any two forms stacked side by side line up.
 */
export function Field({
  id,
  label,
  hint,
  error,
  className = "",
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: string;
  error?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="flex items-baseline justify-between gap-2 text-[0.8125rem] font-medium text-ink"
      >
        {label}
        {hint ? (
          <span className="text-[0.6875rem] font-normal text-ink-3">{hint}</span>
        ) : null}
      </label>

      <input
        id={id}
        aria-invalid={error || undefined}
        {...input}
        className={`h-11 w-full rounded-xl border bg-ground px-3.5 text-[0.875rem] text-ink transition-[border-color,box-shadow] outline-none placeholder:text-ink-3/80 hover:border-line-strong focus:ring-4 ${
          error
            ? "border-bad focus:border-bad focus:ring-bad/10"
            : "border-line focus:border-brand focus:ring-brand/12"
        } ${className}`}
      />
    </div>
  );
}
