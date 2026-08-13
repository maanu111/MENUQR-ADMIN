"use client";

import { useRef, useState, useTransition } from "react";
import { createOffer, setOfferActive } from "@/app/dashboard/offers/actions";
import { Button } from "@/components/ui/Button";
import { rupees } from "@/lib/money";
import { useToast } from "@/components/ui/Toaster";

export type OfferRow = {
  id: string;
  code: string;
  kind: "PERCENT" | "FLAT";
  value: number;
  minSpendPaise: number;
  isActive: boolean;
};

export function OffersTable({ rows }: { rows: OfferRow[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-5">
      <form
        ref={formRef}
        action={(formData) => {
          setError("");
          startTransition(async () => {
            const result = await toast.run(
              () => createOffer(formData),
              `${String(formData.get("code") ?? "Offer").toUpperCase()} created`,
            );
            if (!result?.ok) {
              setError(result?.message ?? "Couldn't create that.");
              return;
            }
            formRef.current?.reset();
          });
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input
          name="code"
          placeholder="WEEKEND20"
          aria-label="Offer code"
          className="num h-9 w-40 rounded-lg border border-line bg-ground px-3 text-[0.8125rem] uppercase outline-none placeholder:normal-case placeholder:text-ink-3 focus:border-brand"
        />
        <select
          name="kind"
          aria-label="Discount type"
          className="h-9 rounded-lg border border-line bg-ground px-2 text-[0.8125rem] outline-none focus:border-brand"
        >
          <option value="PERCENT">% off</option>
          <option value="FLAT">₹ off</option>
        </select>
        <input
          name="value"
          placeholder="20"
          inputMode="decimal"
          aria-label="Discount value"
          className="num h-9 w-20 rounded-lg border border-line bg-ground px-3 text-[0.8125rem] outline-none focus:border-brand"
        />
        <input
          name="minSpend"
          placeholder="Min spend, e.g. 1500"
          inputMode="decimal"
          aria-label="Minimum spend"
          className="num h-9 w-32 rounded-lg border border-line bg-ground px-3 text-[0.8125rem] outline-none focus:border-brand"
        />
        <Button type="submit" disabled={pending} className="h-9 px-4 text-[0.8125rem]">
          {pending ? "Creating…" : "Create offer"}
        </Button>
        {error ? (
          <span role="alert" className="text-[0.6875rem] text-bad">
            {error}
          </span>
        ) : null}
      </form>

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-line bg-ground">
          <table className="w-full min-w-[28rem] text-left">
            <thead>
              <tr className="border-b border-line">
                {["Code", "Discount", "Min spend", "Live"].map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-2.5 text-[0.6875rem] font-medium text-ink-3 ${
                      i === 3 ? "text-right" : ""
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.id} className={row.isActive ? "" : "opacity-50"}>
                  <td className="num px-4 py-3 text-[0.8125rem] font-semibold text-ink">
                    {row.code}
                  </td>
                  <td className="num px-4 py-3 text-[0.8125rem] text-ink-2">
                    {row.kind === "PERCENT"
                      ? `${row.value}% off`
                      : `${rupees(row.value)} off`}
                  </td>
                  <td className="num px-4 py-3 text-[0.8125rem] text-ink-3">
                    {row.minSpendPaise > 0 ? rupees(row.minSpendPaise) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={row.isActive}
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await toast.run(
                            () => setOfferActive(row.id, !row.isActive),
                            row.isActive ? `${row.code} paused` : `${row.code} is live`,
                          );
                        })
                      }
                      className={`inline-flex h-6 w-11 items-center rounded-full p-0.5 transition disabled:opacity-50 ${
                        row.isActive ? "bg-brand" : "bg-line-strong"
                      }`}
                    >
                      <span className="sr-only">
                        {row.isActive ? "Live — tap to pause" : "Paused — tap to run"}
                      </span>
                      <span
                        className={`size-5 rounded-full bg-white transition-transform ${
                          row.isActive ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
