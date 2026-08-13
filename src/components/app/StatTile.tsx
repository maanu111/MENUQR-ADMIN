import type { ReactNode } from "react";

export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
      {children}
    </dl>
  );
}

export function StatTile({
  label,
  value,
  foot,
  tone = "neutral",
}: {
  label: string;
  value: string;
  foot?: string;
  tone?: "neutral" | "good" | "warn";
}) {
  return (
    <div className="bg-ground p-4">
      <dt className="text-[0.6875rem] text-ink-3">{label}</dt>
      <dd className="num mt-1 text-xl font-semibold text-ink">{value}</dd>
      {foot ? (
        <dd
          className={`mt-0.5 text-[0.625rem] ${
            tone === "good"
              ? "text-good"
              : tone === "warn"
                ? "text-warn"
                : "text-ink-3"
          }`}
        >
          {foot}
        </dd>
      ) : null}
    </div>
  );
}

/** Shown wherever a table or list has nothing in it yet. */
export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line py-14 text-center">
      <p className="text-[0.9375rem] font-semibold text-ink">{title}</p>
      <p className="measure px-6 text-[0.8125rem] text-ink-2">{body}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
