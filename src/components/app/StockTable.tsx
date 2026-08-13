"use client";

import { useRef, useState, useTransition } from "react";
import { adjustStock, upsertStock } from "@/app/dashboard/inventory/actions";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";

export type StockRow = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  lowAt: number;
};

export function StockTable({ rows }: { rows: StockRow[] }) {
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
              () => upsertStock(formData),
              `${String(formData.get("name") ?? "Stock")} saved`,
            );
            if (!result?.ok) {
              setError(result?.message ?? "Couldn't save that.");
              return;
            }
            formRef.current?.reset();
          });
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input
          name="name"
          placeholder="e.g. Paneer"
          aria-label="Ingredient"
          className="h-9 w-44 rounded-lg border border-line bg-ground px-3 text-[0.8125rem] outline-none placeholder:text-ink-3 focus:border-brand"
        />
        <input
          name="quantity"
          placeholder="e.g. 8"
          inputMode="decimal"
          aria-label="Quantity"
          className="num h-9 w-20 rounded-lg border border-line bg-ground px-3 text-[0.8125rem] outline-none focus:border-brand"
        />
        <input
          name="unit"
          placeholder="kg / l / pcs"
          defaultValue="kg"
          aria-label="Unit"
          className="h-9 w-20 rounded-lg border border-line bg-ground px-3 text-[0.8125rem] outline-none focus:border-brand"
        />
        <input
          name="lowAt"
          placeholder="Warn at 5"
          inputMode="decimal"
          aria-label="Low stock threshold"
          className="num h-9 w-24 rounded-lg border border-line bg-ground px-3 text-[0.8125rem] outline-none focus:border-brand"
        />
        <Button type="submit" disabled={pending} className="h-9 px-4 text-[0.8125rem]">
          {pending ? "Saving…" : "Save"}
        </Button>
        {error ? (
          <span role="alert" className="text-[0.6875rem] text-bad">
            {error}
          </span>
        ) : null}
      </form>

      <div className="overflow-x-auto rounded-xl border border-line bg-ground">
        <table className="w-full min-w-[30rem] text-left">
          <thead>
            <tr className="border-b border-line">
              {["Ingredient", "In stock", "Warn at", "Adjust"].map((h, i) => (
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
            {rows.map((row) => {
              const low = row.quantity <= row.lowAt;
              return (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-[0.8125rem] text-ink">
                    {row.name}
                    {low ? (
                      <span className="ml-2 text-[0.625rem] font-semibold text-warn">
                        low
                      </span>
                    ) : null}
                  </td>
                  <td
                    className={`num px-4 py-3 text-[0.8125rem] ${
                      low ? "text-warn" : "text-ink"
                    }`}
                  >
                    {row.quantity} {row.unit}
                  </td>
                  <td className="num px-4 py-3 text-[0.75rem] text-ink-3">
                    {row.lowAt} {row.unit}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      {[-1, +1].map((delta) => (
                        <button
                          key={delta}
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              await toast.run(
                                () => adjustStock(row.id, delta),
                                `${row.name} adjusted`,
                              );
                            })
                          }
                          aria-label={`${delta > 0 ? "Add" : "Remove"} one ${row.unit} of ${row.name}`}
                          className="num size-7 rounded-lg border border-line text-[0.75rem] font-semibold text-ink-2 transition hover:bg-surface-2 disabled:opacity-50"
                        >
                          {delta > 0 ? "+" : "−"}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
