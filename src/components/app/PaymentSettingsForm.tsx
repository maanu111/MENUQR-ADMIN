"use client";

import { useState, useTransition } from "react";
import { savePaymentSettings } from "@/app/admin/actions";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";

export function PaymentSettingsForm({
  initial,
}: {
  initial: { upiId: string; payeeName: string; qrUrl: string | null; note: string };
}) {
  const [values, setValues] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const toast = useToast();

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setSaved(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await toast.run(
        () => savePaymentSettings(values),
        "Payment details saved",
      );
      if (!result?.ok) {
        setError(result?.message ?? "");
        return;
      }
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2400);
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
      {/* The QR is the subject of this page, so it gets the whole panel. */}
      <div className="rounded-xl border border-line bg-ground p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-[0.8125rem] font-medium text-ink">UPI QR</span>
          {!values.qrUrl ? (
            <span className="rounded-full bg-warn/12 px-2 py-0.5 text-[0.625rem] font-semibold text-warn">
              required
            </span>
          ) : null}
        </div>
        <ImageUpload
          value={values.qrUrl}
          onChange={(url) => set("qrUrl", url)}
          folder="payment"
          label=""
          size="large"
        />
      </div>

      <div className="rounded-xl border border-line bg-ground p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="payeeName"
            label="Payee name"
            placeholder="Tablet Technologies"
            value={values.payeeName}
            onChange={(e) => set("payeeName", e.target.value)}
          />
          <Field
            id="upiId"
            label="UPI ID"
            placeholder="tablet@okhdfcbank"
            value={values.upiId}
            onChange={(e) => set("upiId", e.target.value)}
          />
        </div>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-[0.8125rem] font-medium text-ink">Instructions</span>
          <textarea
            value={values.note}
            onChange={(e) => set("note", e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="e.g. Pay to the UPI ID above, then upload the screenshot. We verify within one working day."
            aria-label="Payment instructions shown to restaurants"
            className="w-full rounded-xl border border-line bg-ground px-3.5 py-2.5 text-[0.875rem] text-ink outline-none placeholder:text-ink-3 focus:border-brand focus:ring-4 focus:ring-brand/12"
          />
        </label>

        {error ? (
          <p role="alert" className="mt-3 text-[0.75rem] text-bad">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex items-center gap-3">
          <Button type="submit" disabled={pending} className="h-10 px-5">
            {pending ? "Saving…" : "Save"}
          </Button>
          {saved ? (
            <span role="status" className="text-[0.75rem] font-medium text-good">
              Saved
            </span>
          ) : null}
        </div>
      </div>
    </form>
  );
}
