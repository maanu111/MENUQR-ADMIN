"use client";

import { useState, useTransition } from "react";
import { raiseInvoice, setSubscriptionStatus } from "@/app/admin/actions";
import type { SubscriptionStatus } from "@/generated/prisma";
import { useToast } from "@/components/ui/Toaster";

const OPTIONS: SubscriptionStatus[] = [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELLED",
];

export function SubscriptionControl({
  subscriptionId,
  status,
  canInvoice,
}: {
  subscriptionId: string;
  status: SubscriptionStatus;
  /** False for custom-priced plans, which are billed offline. */
  canInvoice: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const toast = useToast();

  return (
    <span className="flex items-center gap-2">
      <select
        value={status}
        disabled={pending}
        onChange={(e) =>
          startTransition(async () => {
            const next = e.target.value as SubscriptionStatus;
            const result = await toast.run(
              () => setSubscriptionStatus(subscriptionId, next),
              `Subscription set to ${next.toLowerCase().replace("_", " ")}`,
            );
            if (result && !result.ok) setError("Couldn't change that.");
          })
        }
        className="h-9 rounded-lg border border-line bg-ground px-2 text-[0.8125rem] outline-none focus:border-brand disabled:opacity-50"
      >
        {OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option.toLowerCase().replace("_", " ")}
          </option>
        ))}
      </select>
      {canInvoice ? (
        confirming ? (
          <span className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await toast.run(
                    () => raiseInvoice(subscriptionId),
                    "Invoice raised — they can pay it now",
                  );
                  if (result?.ok) setConfirming(false);
                })
              }
              className="rounded-lg bg-brand px-3 py-1.5 text-[0.75rem] font-semibold text-brand-ink transition hover:bg-brand-deep disabled:opacity-50"
            >
              {pending ? "Raising…" : "Yes, bill this month"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-[0.6875rem] text-ink-3 hover:text-ink"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-lg border border-line px-3 py-1.5 text-[0.75rem] font-semibold text-ink transition hover:bg-surface-2"
          >
            Raise an invoice
          </button>
        )
      ) : (
        <span className="text-[0.6875rem] text-ink-3">
          Custom plan — invoiced offline
        </span>
      )}

      {error ? (
        <span role="alert" className="text-[0.6875rem] text-bad">
          {error}
        </span>
      ) : null}
    </span>
  );
}
