"use client";

import { useState, useTransition } from "react";
import { acknowledgeCall } from "@/app/dashboard/orders/actions";
import { useToast } from "@/components/ui/Toaster";

export type CallRow = {
  id: string;
  table: string;
  reason: string;
  createdAt: string;
};

const REASON_LABEL: Record<string, string> = {
  water: "water",
  cutlery: "cutlery",
  napkins: "napkins",
  bill: "the bill",
  assistance: "a server",
};

function waited(since: string) {
  const mins = Math.floor((Date.now() - new Date(since).getTime()) / 60000);
  if (mins < 1) return "just now";
  return `${mins}m ago`;
}

/**
 * Sits above the queue because a guest with a raised hand outranks a ticket.
 * Anyone on the floor can clear it — first to the table wins.
 */
export function WaiterCalls({ calls }: { calls: CallRow[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const toast = useToast();

  if (calls.length === 0) return null;

  return (
    <section
      aria-label="Tables calling"
      className="rounded-xl border border-warn/40 bg-warn/5 p-4"
    >
      <div className="mb-2.5 flex items-center gap-2">
        <span className="size-2 animate-pulse rounded-full bg-warn" />
        <h2 className="text-[0.8125rem] font-semibold text-ink">
          {calls.length} table{calls.length === 1 ? "" : "s"} calling
        </h2>
      </div>

      <ul className="flex flex-wrap gap-2">
        {calls.map((call) => (
          <li key={call.id}>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await toast.run(
                    () => acknowledgeCall(call.id),
                    `Table ${call.table} — on your way`,
                  );
                  if (result && !result.ok) setError(result.message ?? "");
                })
              }
              className="flex items-center gap-2.5 rounded-lg border border-line bg-ground px-3 py-2 text-left transition hover:border-warn active:scale-[0.98] disabled:opacity-50"
            >
              <span className="num text-[0.875rem] font-semibold text-ink">
                T{call.table}
              </span>
              <span className="text-[0.75rem] text-ink-2">
                needs {REASON_LABEL[call.reason] ?? call.reason}
              </span>
              <span className="num text-[0.625rem] text-ink-3">
                {waited(call.createdAt)}
              </span>
              <span className="ml-1 rounded border border-line px-1.5 py-0.5 text-[0.625rem] font-semibold text-ink-3">
                I&rsquo;ve got it
              </span>
            </button>
          </li>
        ))}
      </ul>

      {error ? (
        <p role="alert" className="mt-2 text-[0.6875rem] text-bad">
          {error}
        </p>
      ) : null}
    </section>
  );
}
