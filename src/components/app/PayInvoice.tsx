"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { submitPaymentProof } from "@/app/dashboard/billing/actions";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Button } from "@/components/ui/Button";
import { rupees } from "@/lib/money";
import { useToast } from "@/components/ui/Toaster";

export type PayableInvoice = {
  id: string;
  number: string;
  amountPaise: number;
  rejectedReason: string | null;
};

/**
 * Pay-by-UPI, three steps in one panel: scan, pay in your own app, then prove
 * it. Deliberately manual — there is no gateway, and the platform verifies.
 */
export function PayInvoice({
  invoice,
  upiId,
  payeeName,
  qrUrl,
  note,
}: {
  invoice: PayableInvoice;
  upiId: string;
  payeeName: string;
  qrUrl: string | null;
  note: string;
}) {
  const [open, setOpen] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [paymentRef, setPaymentRef] = useState("");
  const [payerNote, setPayerNote] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  if (!qrUrl || !upiId) {
    return (
      <p className="rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-[0.75rem] text-ink-2">
        The platform hasn&rsquo;t published payment details yet. Nothing to pay
        into — contact support.
      </p>
    );
  }

  if (!open) {
    return (
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 px-4 text-[0.8125rem]"
      >
        Pay {rupees(invoice.amountPaise)}
      </Button>
    );
  }

  function submit() {
    setError("");
    startTransition(async () => {
      const result = await toast.run(
        () =>
          submitPaymentProof({
            invoiceId: invoice.id,
            proofUrl: proofUrl ?? "",
            paymentRef,
            note: payerNote,
          }),
        "Sent for verification",
      );
      if (!result?.ok) {
        setError(result?.message ?? "");
        return;
      }
      setOpen(false);
    });
  }

  return (
    <div className="mt-3 rounded-xl border border-line bg-ground p-5">
      <div className="grid gap-6 md:grid-cols-[auto_minmax(0,1fr)]">
        {/* ------------------------------------------------ Scan and pay */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative size-40 overflow-hidden rounded-xl border border-line bg-white">
            <Image src={qrUrl} alt="UPI QR code" fill sizes="160px" className="object-contain p-2" />
          </div>
          <p className="num text-[0.8125rem] font-semibold text-ink">
            {rupees(invoice.amountPaise)}
          </p>
          <p className="text-[0.625rem] text-ink-3">{invoice.number}</p>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[0.8125rem] font-semibold text-ink">
              1 · Pay {rupees(invoice.amountPaise)} to this UPI ID
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="num rounded-lg border border-line px-3 py-1.5 text-[0.8125rem] text-ink">
                {upiId}
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(upiId);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1800);
                  } catch {
                    /* Clipboard blocked; the id is on screen anyway. */
                  }
                }}
                className="rounded-lg border border-line px-2.5 py-1.5 text-[0.6875rem] font-semibold text-ink-2 transition hover:bg-surface-2"
              >
                {copied ? "Copied" : "Copy"}
              </button>
              {payeeName ? (
                <span className="text-[0.75rem] text-ink-3">to {payeeName}</span>
              ) : null}
            </div>
            {note ? (
              <p className="mt-2 text-[0.75rem] leading-relaxed text-ink-2">{note}</p>
            ) : null}
          </div>

          <div>
            <p className="mb-2 text-[0.8125rem] font-semibold text-ink">
              2 · Attach the payment screenshot
            </p>
            <ImageUpload
              value={proofUrl}
              onChange={setProofUrl}
              folder="proofs"
              label=""
              aspect="wide"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.8125rem] font-medium text-ink">
                3 · UPI reference number
              </span>
              <input
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="e.g. 412345678901 — from your UPI app"
                className="num h-11 rounded-xl border border-line bg-ground px-3.5 text-[0.875rem] outline-none placeholder:font-sans placeholder:text-ink-3 focus:border-brand focus:ring-4 focus:ring-brand/12"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.8125rem] font-medium text-ink">
                Note <span className="text-[0.6875rem] font-normal text-ink-3">optional</span>
              </span>
              <input
                value={payerNote}
                onChange={(e) => setPayerNote(e.target.value)}
                placeholder="e.g. paid from the company account"
                className="h-11 rounded-xl border border-line bg-ground px-3.5 text-[0.875rem] outline-none placeholder:text-ink-3 focus:border-brand focus:ring-4 focus:ring-brand/12"
              />
            </label>
          </div>

          {invoice.rejectedReason ? (
            <p className="rounded-lg border border-bad/30 bg-bad/5 px-3 py-2 text-[0.75rem] text-ink-2">
              Previously rejected: {invoice.rejectedReason}
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="text-[0.75rem] text-bad">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={submit}
              disabled={pending || !proofUrl}
              className="h-10 px-5"
            >
              {pending ? "Submitting…" : "Submit for verification"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              className="h-10 px-5"
            >
              Cancel
            </Button>
          </div>

          <p className="text-[0.6875rem] text-ink-3">
            Your account stays live while we check the screenshot. You&rsquo;ll
            see it marked paid here once it clears.
          </p>
        </div>
      </div>
    </div>
  );
}
