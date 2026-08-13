"use client";

import { useState, useTransition } from "react";
import { toggleAvailability, updatePrice } from "@/app/dashboard/menu/actions";
import { rupees } from "@/lib/money";
import { useToast } from "@/components/ui/Toaster";
import { MenuItemEditor, type EditableItem } from "./MenuItemEditor";

export type MenuRowData = {
  id: string;
  categoryId: string;
  code: string;
  name: string;
  description: string | null;
  pricePaise: number;
  costPaise: number;
  diet: "VEG" | "NONVEG" | "EGG";
  isAvailable: boolean;
  prepMinutes: number;
  spiceLevel: number;
  imageUrl: string | null;
  isBestseller: boolean;
  isAddOn: boolean;
};

/** Margin is the number an owner edits a price to change. Show it inline. */
function marginPercent(price: number, cost: number) {
  if (price <= 0 || cost <= 0) return null;
  return Math.round(((price - cost) / price) * 100);
}

export function MenuRow({
  item,
  categories,
}: {
  item: MenuRowData;
  categories: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(String(item.pricePaise / 100));
  const [error, setError] = useState("");
  const toast = useToast();

  const margin = marginPercent(item.pricePaise, item.costPaise);

  function savePrice() {
    const value = Number(draft);
    setError("");
    startTransition(async () => {
      const result = await toast.run(
        () => updatePrice(item.id, value),
        `${item.name} price updated`,
      );
      if (!result?.ok) {
        setError(result?.message ?? "Couldn't save that.");
        return;
      }
      setEditing(false);
    });
  }

  return (
    <>
    <tr className="transition hover:bg-surface-2">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            title={item.diet === "VEG" ? "Vegetarian" : "Non-vegetarian"}
            className={`grid size-3 shrink-0 place-items-center rounded-[2px] border ${
              item.diet === "VEG" ? "border-good" : "border-bad"
            }`}
          >
            <span
              className={`size-1 rounded-full ${
                item.diet === "VEG" ? "bg-good" : "bg-bad"
              }`}
            />
          </span>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="text-left text-[0.8125rem] font-medium text-ink underline decoration-transparent underline-offset-4 transition hover:decoration-brand"
          >
            {item.name}
          </button>
          {item.isBestseller ? (
            <span className="rounded-full bg-brand-wash px-1.5 py-0.5 text-[0.5625rem] font-semibold text-brand">
              top
            </span>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="mt-1 text-[0.625rem] text-bad">
            {error}
          </p>
        ) : null}
      </td>

      <td className="num px-4 py-3 text-[0.75rem] text-ink-3">{item.code}</td>

      <td className="px-4 py-3">
        {editing ? (
          <span className="flex items-center gap-1.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              inputMode="decimal"
              autoFocus
              aria-label={`Price for ${item.name}`}
              placeholder="e.g. 340"
              className="num h-8 w-20 rounded-lg border border-brand bg-ground px-2 text-[0.8125rem] outline-none"
            />
            <button
              type="button"
              onClick={savePrice}
              disabled={pending}
              className="rounded-lg bg-brand px-2.5 py-1.5 text-[0.625rem] font-semibold text-brand-ink disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setDraft(String(item.pricePaise / 100));
                setError("");
              }}
              className="text-[0.625rem] text-ink-3 hover:text-ink"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="num rounded px-1 text-[0.8125rem] text-ink underline decoration-line underline-offset-4 transition hover:decoration-brand"
          >
            {rupees(item.pricePaise)}
          </button>
        )}
      </td>

      <td className="num px-4 py-3 text-[0.75rem] text-ink-2">
        {margin === null ? "—" : `${margin}%`}
      </td>

      <td className="num px-4 py-3 text-[0.75rem] text-ink-3">
        {item.prepMinutes}m
      </td>

      <td className="px-4 py-3 text-right">
        <button
          type="button"
          role="switch"
          aria-checked={item.isAvailable}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await toast.run(
                () => toggleAvailability(item.id, !item.isAvailable),
                item.isAvailable
                  ? `${item.name} marked sold out`
                  : `${item.name} is back on`,
              );
            })
          }
          className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition disabled:opacity-50 ${
            item.isAvailable ? "bg-brand" : "bg-line-strong"
          }`}
        >
          <span className="sr-only">
            {item.isAvailable ? "Available — tap to hide" : "Sold out — tap to show"}
          </span>
          <span
            className={`size-5 rounded-full bg-white transition-transform ${
              item.isAvailable ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </td>
    </tr>

    {expanded ? (
      <tr>
        <td colSpan={6} className="bg-surface px-4 py-4">
          <MenuItemEditor
            categories={categories}
            onDone={() => setExpanded(false)}
            item={
              {
                id: item.id,
                categoryId: item.categoryId,
                code: item.code,
                name: item.name,
                description: item.description ?? "",
                price: String(item.pricePaise / 100),
                cost: String(item.costPaise / 100),
                diet: item.diet,
                prepMinutes: String(item.prepMinutes),
                spiceLevel: String(item.spiceLevel),
                imageUrl: item.imageUrl,
                isBestseller: item.isBestseller,
                isAddOn: item.isAddOn,
              } satisfies EditableItem
            }
          />
        </td>
      </tr>
    ) : null}
    </>
  );
}
