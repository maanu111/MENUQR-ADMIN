"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toaster";

/**
 * The default way to get started: one code for the whole restaurant. It opens
 * the menu and asks the guest which table they are at, so a single printed
 * sticker works everywhere — no reprinting when tables move.
 */
export function SharedQrCard({
  qrSvg,
  url,
  restaurantName,
  tableCount,
}: {
  qrSvg: string;
  url: string;
  restaurantName: string;
  tableCount: number;
}) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.ok("Link copied");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.fail("Couldn't copy — the link is shown below.");
    }
  }

  return (
    <section className="rounded-xl border-2 border-brand bg-ground p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="mx-auto w-full max-w-[11rem] shrink-0 sm:mx-0">
          <div
            className="rounded-xl bg-white p-4 text-black [&_svg]:size-full"
            role="img"
            aria-label={`QR code for ${restaurantName}`}
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <span className="eyebrow text-brand">Recommended</span>
          <h2 className="mt-1 text-[1.0625rem] font-semibold text-ink">
            One code for the whole restaurant
          </h2>
          <p className="measure mt-2 text-[0.875rem] leading-relaxed text-ink-2">
            Print this once and put it on every table, the counter, or a
            standee. Guests scan it, tap which of your {tableCount} tables
            they&rsquo;re at, and order. Move tables around and it still works —
            nothing to reprint.
          </p>

          <p className="num mt-3 rounded-lg bg-surface-2 px-3 py-2 text-[0.6875rem] break-all text-ink-3">
            {url}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copy}
              className="rounded-lg border border-line px-3 py-2 text-[0.75rem] font-semibold text-ink-2 transition hover:bg-surface-2"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            <a
              href="/print/tables"
              className="rounded-lg bg-brand px-3 py-2 text-[0.75rem] font-semibold text-brand-ink transition hover:bg-brand-deep"
            >
              Print this code
            </a>
          </div>
        </div>
      </div>

      <p className="mt-4 border-t border-line pt-3 text-[0.75rem] text-ink-3">
        Prefer a code per table? They&rsquo;re below — those skip the
        &ldquo;which table&rdquo; step entirely.
      </p>
    </section>
  );
}
