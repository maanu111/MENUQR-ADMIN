"use client";

import { useMemo, useState, useTransition } from "react";
import { createPosOrder } from "@/app/dashboard/pos/actions";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { rupees } from "@/lib/money";

export type PosItem = {
  id: string;
  name: string;
  code: string;
  pricePaise: number;
  category: string;
  diet: "VEG" | "NONVEG" | "EGG";
};

export function PosTerminal({
  items,
  tables,
  gstPercent,
}: {
  items: PosItem[];
  tables: { id: string; number: string }[];
  gstPercent: number;
}) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [tableId, setTableId] = useState("");
  const [guests, setGuests] = useState(2);
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const toast = useToast();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q),
    );
  }, [items, query]);

  const lines = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ item: items.find((i) => i.id === id)!, qty }))
    .filter((l) => l.item);

  const subtotal = lines.reduce((n, l) => n + l.qty * l.item.pricePaise, 0);
  const tax = Math.round((subtotal * gstPercent) / 100);

  function bump(id: string, delta: number) {
    setDone("");
    setCart((prev) => {
      const next = Math.max(0, (prev[id] ?? 0) + delta);
      const copy = { ...prev };
      if (next === 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });
  }

  function send() {
    setError("");
    setDone("");
    startTransition(async () => {
      const result = await toast.run(
        () =>
          createPosOrder({
            lines: lines.map((l) => ({ menuItemId: l.item.id, qty: l.qty })),
            tableId: tableId || null,
            guests,
            note,
          }),
        "Sent to the kitchen",
      );
      if (!result?.ok) {
        setError(result?.message ?? "");
        return;
      }
      setCart({});
      setNote("");
      setDone(`${result.code} sent to the kitchen`);
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      {/* ------------------------------------------------------- Menu grid */}
      <div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a dish, or type its code"
          aria-label="Search the menu"
          className="mb-4 h-10 w-full rounded-xl border border-line bg-ground px-3.5 text-[0.875rem] outline-none placeholder:text-ink-3 focus:border-brand focus:ring-4 focus:ring-brand/12"
        />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => {
            const qty = cart[item.id] ?? 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => bump(item.id, 1)}
                className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition active:scale-[0.98] ${
                  qty > 0
                    ? "border-brand bg-brand-wash"
                    : "border-line bg-ground hover:border-line-strong"
                }`}
              >
                <span className="flex w-full items-center gap-1.5">
                  <span
                    className={`grid size-2.5 shrink-0 place-items-center rounded-[2px] border ${
                      item.diet === "VEG" ? "border-good" : "border-bad"
                    }`}
                  >
                    <span
                      className={`size-1 rounded-full ${
                        item.diet === "VEG" ? "bg-good" : "bg-bad"
                      }`}
                    />
                  </span>
                  <span className="num ml-auto text-[0.625rem] text-ink-3">
                    {item.code}
                  </span>
                </span>
                <span className="line-clamp-2 text-[0.8125rem] leading-snug font-medium text-ink">
                  {item.name}
                </span>
                <span className="num mt-auto text-[0.8125rem] font-semibold text-ink">
                  {rupees(item.pricePaise)}
                </span>
                {qty > 0 ? (
                  <span className="num text-[0.6875rem] font-semibold text-brand">
                    {qty} on order
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* ----------------------------------------------------------- Ticket */}
      <aside className="flex h-fit flex-col gap-3 rounded-xl border border-line bg-ground p-4 lg:sticky lg:top-6">
        <div className="flex gap-2">
          <select
            value={tableId}
            onChange={(e) => setTableId(e.target.value)}
            aria-label="Table"
            className="h-9 flex-1 rounded-lg border border-line bg-ground px-2 text-[0.8125rem] outline-none focus:border-brand"
          >
            <option value="">Takeaway / counter</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                Table {t.number}
              </option>
            ))}
          </select>
          <input
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value) || 1)}
            inputMode="numeric"
            aria-label="Guests"
            placeholder="e.g. 2"
            className="num h-9 w-14 rounded-lg border border-line bg-ground px-2 text-center text-[0.8125rem] outline-none focus:border-brand"
          />
        </div>

        {lines.length === 0 ? (
          <p className="py-8 text-center text-[0.8125rem] text-ink-3">
            Tap a dish to start a ticket.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 border-t border-line pt-3">
            {lines.map((line) => (
              <li key={line.item.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-ink">
                  {line.item.name}
                </span>
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => bump(line.item.id, -1)}
                    aria-label={`One fewer ${line.item.name}`}
                    className="num size-6 rounded border border-line text-[0.75rem] text-ink-2 hover:bg-surface-2"
                  >
                    −
                  </button>
                  <span className="num w-5 text-center text-[0.8125rem] font-semibold text-ink">
                    {line.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => bump(line.item.id, 1)}
                    aria-label={`One more ${line.item.name}`}
                    className="num size-6 rounded border border-line text-[0.75rem] text-ink-2 hover:bg-surface-2"
                  >
                    +
                  </button>
                </span>
                <span className="num w-16 text-right text-[0.8125rem] text-ink">
                  {rupees(line.qty * line.item.pricePaise)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. no onion, extra spicy"
          aria-label="Kitchen note"
          className="h-9 w-full rounded-lg border border-line bg-ground px-3 text-[0.8125rem] outline-none placeholder:text-ink-3 focus:border-brand"
        />

        <dl className="flex flex-col gap-1 border-t border-line pt-3 text-[0.8125rem]">
          <div className="flex justify-between">
            <dt className="text-ink-2">Subtotal</dt>
            <dd className="num text-ink">{rupees(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-2">
              GST <span className="num">{gstPercent}%</span>
            </dt>
            <dd className="num text-ink">{rupees(tax)}</dd>
          </div>
          <div className="mt-1 flex justify-between border-t border-line pt-2">
            <dt className="font-semibold text-ink">Total</dt>
            <dd className="num font-semibold text-ink">{rupees(subtotal + tax)}</dd>
          </div>
        </dl>

        {error ? (
          <p role="alert" className="text-[0.75rem] text-bad">
            {error}
          </p>
        ) : null}
        {done ? (
          <p role="status" className="text-[0.75rem] text-good">
            {done}
          </p>
        ) : null}

        <Button
          type="button"
          onClick={send}
          disabled={pending || lines.length === 0}
          className="w-full"
        >
          {pending ? "Sending…" : "Send to kitchen"}
        </Button>
      </aside>
    </div>
  );
}
