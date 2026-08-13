"use client";

import { useState, useTransition } from "react";
import { toggleFlag } from "@/app/admin/actions";
import { useToast } from "@/components/ui/Toaster";
import { featureLabel } from "@/lib/feature-labels";

export function FlagToggle({
  restaurantId,
  flagKey,
  enabled,
  overridden,
}: {
  restaurantId: string;
  flagKey: string;
  enabled: boolean;
  /** True when a row exists — the plan default has been deliberately replaced. */
  overridden: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [on, setOn] = useState(enabled);
  const toast = useToast();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${featureLabel(flagKey)} for this restaurant`}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const next = !on;
          setOn(next);
          const result = await toast.run(
            () => toggleFlag(restaurantId, flagKey, next),
            next
              ? `${featureLabel(flagKey)} switched on`
              : `${featureLabel(flagKey)} switched off`,
          );
          if (!result?.ok) setOn(!next);
        })
      }
      className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition disabled:opacity-50 ${
        on ? "bg-brand" : "bg-line-strong"
      } ${overridden ? "ring-2 ring-warn/40" : ""}`}
      title={
        overridden
          ? "You set this by hand — it ignores the plan"
          : "Following whatever the plan allows"
      }
    >
      <span
        className={`size-4 rounded-full bg-white transition-transform ${
          on ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}
