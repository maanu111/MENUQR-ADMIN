"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { advanceOrder, cancelOrder, markPaid } from "@/app/dashboard/orders/actions";
import { rupees } from "@/lib/money";
import { useToast } from "@/components/ui/Toaster";

export type OrderCardData = {
  id: string;
  code: string;
  stage: string;
  channel: string;
  guests: number;
  totalPaise: number;
  paymentStatus: string;
  placedAt: string;
  tableNumber: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  addressNote: string | null;
  note: string | null;
  items: { id: string; name: string; qty: number; options: string[] }[];
};

const NEXT_LABEL: Record<string, string> = {
  PLACED: "Accept",
  ACCEPTED: "Start cooking",
  PREPARING: "Mark ready",
  READY: "Mark served",
};

const STAGE_STYLE: Record<string, string> = {
  PLACED: "border-brand text-brand",
  ACCEPTED: "border-brand text-brand",
  PREPARING: "border-warn text-warn",
  READY: "border-good text-good",
  SERVED: "border-line text-ink-3",
  CANCELLED: "border-line text-ink-3",
};

/** How long the ticket has been open — the number the kitchen actually reads. */
function waited(placedAt: string) {
  const mins = Math.floor((Date.now() - new Date(placedAt).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

export function OrderCard({
  order,
  canCancel,
}: {
  order: OrderCardData;
  canCancel: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const toast = useToast();

  function run(
    action: () => Promise<{ ok: boolean; message?: string }>,
    success: string,
  ) {
    setError("");
    startTransition(async () => {
      const result = await toast.run(action, success);
      if (result && !result.ok) setError(result.message ?? "That didn't work.");
    });
  }

  const nextLabel = NEXT_LABEL[order.stage];

  return (
    <article className="flex flex-col rounded-xl border border-line bg-ground">
      <header className="flex items-center gap-2.5 border-b border-line px-4 py-3">
        <Link
          href={`/dashboard/orders/${order.id}`}
          className="num text-[0.875rem] font-semibold text-ink underline decoration-transparent underline-offset-4 transition hover:decoration-brand"
        >
          {order.code}
        </Link>
        <span
          className={`num rounded border px-1.5 py-0.5 text-[0.625rem] ${
            order.channel === "DELIVERY"
              ? "border-brand bg-brand-wash font-semibold text-brand"
              : "border-line text-ink-2"
          }`}
        >
          {order.tableNumber ? `T${order.tableNumber}` : order.channel}
        </span>
        {order.channel === "DELIVERY" ? null : (
          <span className="num text-[0.625rem] text-ink-3">
            {order.guests} {order.guests === 1 ? "guest" : "guests"}
          </span>
        )}
        <span
          className={`ml-auto rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold ${
            STAGE_STYLE[order.stage] ?? "border-line text-ink-3"
          }`}
        >
          {order.stage.toLowerCase()}
        </span>
      </header>

      <ul className="flex flex-col gap-1.5 px-4 py-3">
        {order.items.map((item) => (
          <li key={item.id} className="flex gap-2 text-[0.8125rem]">
            <span className="num w-6 shrink-0 font-semibold text-ink">
              {item.qty}×
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-ink">{item.name}</span>
              {item.options.length > 0 ? (
                <span className="block text-[0.6875rem] text-ink-3">
                  {item.options.join(" · ")}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      {order.customerAddress ? (
        <div className="mx-4 mb-3 rounded-lg border border-brand/25 bg-brand-wash px-3 py-2.5">
          <p className="flex items-baseline gap-2 text-[0.75rem] font-semibold text-ink">
            {order.customerName ?? "Delivery"}
            {order.customerPhone ? (
              <a
                href={`tel:${order.customerPhone}`}
                className="num ml-auto shrink-0 font-semibold text-brand hover:underline"
              >
                {order.customerPhone}
              </a>
            ) : null}
          </p>
          <p className="mt-1 text-[0.75rem] leading-relaxed text-ink-2">
            {order.customerAddress}
          </p>
          {order.addressNote ? (
            <p className="mt-0.5 text-[0.6875rem] text-ink-3">
              {order.addressNote}
            </p>
          ) : null}
        </div>
      ) : null}

      {order.note ? (
        <p className="mx-4 mb-3 rounded-lg bg-surface-2 px-3 py-2 text-[0.75rem] text-ink-2">
          {order.note}
        </p>
      ) : null}

      <footer className="mt-auto flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
        <span className="num text-[0.8125rem] font-semibold text-ink">
          {rupees(order.totalPaise)}
        </span>
        <span className="num text-[0.625rem] text-ink-3">
          {waited(order.placedAt)}
        </span>

        <div className="ml-auto flex gap-1.5">
          {order.paymentStatus === "UNPAID" && order.stage !== "CANCELLED" ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => markPaid(order.id), `${order.code} marked paid`)}
              className="rounded-lg border border-line px-2.5 py-1.5 text-[0.6875rem] font-semibold text-ink-2 transition hover:bg-surface-2 disabled:opacity-50"
            >
              Mark paid
            </button>
          ) : null}

          {canCancel && nextLabel ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => cancelOrder(order.id), `${order.code} cancelled`)}
              className="rounded-lg border border-line px-2.5 py-1.5 text-[0.6875rem] font-semibold text-ink-3 transition hover:border-bad hover:text-bad disabled:opacity-50"
            >
              Cancel
            </button>
          ) : null}

          {nextLabel ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => advanceOrder(order.id), `${order.code} moved on`)}
              className="rounded-lg bg-brand px-3 py-1.5 text-[0.6875rem] font-semibold text-brand-ink transition hover:bg-brand-deep disabled:opacity-50"
            >
              {pending ? "…" : nextLabel}
            </button>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="w-full text-[0.6875rem] text-bad">
            {error}
          </p>
        ) : null}
      </footer>
    </article>
  );
}
