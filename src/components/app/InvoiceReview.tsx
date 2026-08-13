"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { rejectInvoice, verifyInvoice } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { rupees } from "@/lib/money";
import { useToast } from "@/components/ui/Toaster";

export type ReviewRow = {
  id: string;
  number: string;
  restaurantName: string;
  amountPaise: number;
  proofUrl: string | null;
  paymentRef: string | null;
  payerNote: string | null;
  submittedAt: string | null;
};

/** Look at the screenshot, match the reference, then approve or send back. */
export function InvoiceReview({ rows }: { rows: ReviewRow[] }) {
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState<string | null>(null);
  const toast = useToast();

  if (rows.length === 0) return null;

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-[0.9375rem] font-semibold text-ink">Awaiting verification</h2>
        <span className="num rounded-full bg-brand-wash px-2 py-0.5 text-[0.625rem] font-semibold text-brand">
          {rows.length}
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((row) => (
          <article key={row.id} className="rounded-xl border border-line bg-ground p-4">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => row.proofUrl && setZoom(row.proofUrl)}
                className="relative size-28 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-2"
                aria-label="Enlarge payment screenshot"
              >
                {row.proofUrl ? (
                  <Image
                    src={row.proofUrl}
                    alt={`Payment screenshot for ${row.number}`}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                ) : (
                  <span className="grid size-full place-items-center text-[0.625rem] text-ink-3">
                    no proof
                  </span>
                )}
              </button>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.875rem] font-semibold text-ink">
                  {row.restaurantName}
                </p>
                <p className="num text-[0.6875rem] text-ink-3">{row.number}</p>
                <p className="num mt-1 text-[0.9375rem] font-semibold text-ink">
                  {rupees(row.amountPaise)}
                </p>
                <p className="num mt-1 text-[0.6875rem] text-ink-2">
                  ref {row.paymentRef ?? "—"}
                </p>
                {row.submittedAt ? (
                  <p className="num text-[0.625rem] text-ink-3">
                    submitted{" "}
                    {new Date(row.submittedAt).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                ) : null}
              </div>
            </div>

            {row.payerNote ? (
              <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-[0.75rem] text-ink-2">
                {row.payerNote}
              </p>
            ) : null}

            {rejecting === row.id ? (
              <div className="mt-3 flex flex-col gap-2">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. the screenshot shows ₹999, not ₹2,499"
                  autoFocus
                  className="h-10 w-full rounded-lg border border-line bg-ground px-3 text-[0.8125rem] outline-none placeholder:text-ink-3 focus:border-bad"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await toast.run(
                          () => rejectInvoice(row.id, reason),
                          `${row.number} sent back to ${row.restaurantName}`,
                        );
                        if (!result?.ok) {
                          setError(result?.message ?? "");
                          return;
                        }
                        setRejecting(null);
                        setReason("");
                        setError("");
                      })
                    }
                    className="h-9 border-bad px-4 text-[0.8125rem] text-bad"
                  >
                    Send back
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setRejecting(null);
                      setError("");
                    }}
                    className="h-9 px-4 text-[0.8125rem]"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await toast.run(
                        () => verifyInvoice(row.id),
                        `${row.number} marked paid`,
                      );
                      if (result && !result.ok) setError(result.message ?? "");
                    })
                  }
                  className="h-9 px-4 text-[0.8125rem]"
                >
                  {pending ? "…" : "Mark paid"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setRejecting(row.id)}
                  className="h-9 px-4 text-[0.8125rem]"
                >
                  Reject
                </Button>
              </div>
            )}

            {error && (rejecting === row.id || rejecting === null) ? (
              <p role="alert" className="mt-2 text-[0.6875rem] text-bad">
                {error}
              </p>
            ) : null}
          </article>
        ))}
      </div>

      {zoom ? (
        <button
          type="button"
          onClick={() => setZoom(null)}
          aria-label="Close preview"
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6 backdrop-blur-sm"
        >
          <span className="relative block h-[80vh] w-full max-w-3xl">
            <Image src={zoom} alt="Payment screenshot" fill className="object-contain" />
          </span>
        </button>
      ) : null}
    </section>
  );
}
