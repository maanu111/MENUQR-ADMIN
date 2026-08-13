"use client";

import Image from "next/image";
import { useRef, useState } from "react";

/**
 * Choose or drop an image, upload it, hand the stored path back. Shows the
 * real file the whole time so nobody wonders whether it saved.
 */
export function ImageUpload({
  value,
  onChange,
  folder,
  label = "Image",
  hint,
  aspect = "square",
  size = "normal",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: "dishes" | "logos" | "payment" | "proofs" | "banners";
  label?: string;
  hint?: string;
  aspect?: "square" | "wide";
  /** "large" gives the image the whole panel — used where it is the subject. */
  size?: "normal" | "large";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  async function send(file: File | undefined) {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", folder);

      const response = await fetch("/api/upload", { method: "POST", body });
      const result = (await response.json().catch(() => ({}))) as {
        url?: string;
        message?: string;
      };

      if (!response.ok || !result.url) {
        setError(result.message ?? "Upload failed.");
        return;
      }
      onChange(result.url);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between gap-2 text-[0.8125rem] font-medium text-ink">
        {label}
        {hint ? <span className="text-[0.6875rem] font-normal text-ink-3">{hint}</span> : null}
      </span>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        aria-label={label}
        onChange={(e) => send(e.target.files?.[0])}
      />

      {value && size === "large" ? (
        <div className="flex flex-col gap-2">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-line bg-white">
            <Image src={value} alt="" fill sizes="320px" className="object-contain p-3" />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="flex-1 rounded-lg border border-line py-2 text-[0.6875rem] font-semibold text-ink-2 transition hover:bg-surface-2 disabled:opacity-50"
            >
              {busy ? "Uploading…" : "Replace"}
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={busy}
              className="rounded-lg border border-line px-3 py-2 text-[0.6875rem] font-semibold text-ink-3 transition hover:border-bad hover:text-bad disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : value ? (
        <div className="flex items-start gap-3 rounded-xl border border-line bg-ground p-3">
          <div
            className={`relative shrink-0 overflow-hidden rounded-lg border border-line bg-surface-2 ${
              aspect === "square" ? "size-20" : "h-20 w-32"
            }`}
          >
            <Image src={value} alt="" fill sizes="128px" className="object-contain p-1" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="num truncate text-[0.6875rem] text-ink-3">{value}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="rounded-lg border border-line px-2.5 py-1.5 text-[0.6875rem] font-semibold text-ink-2 transition hover:bg-surface-2 disabled:opacity-50"
              >
                {busy ? "Uploading…" : "Replace"}
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                disabled={busy}
                className="rounded-lg border border-line px-2.5 py-1.5 text-[0.6875rem] font-semibold text-ink-3 transition hover:border-bad hover:text-bad disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void send(e.dataTransfer.files?.[0]);
          }}
          disabled={busy}
          className={`flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-[0.75rem] transition ${
            size === "large" ? "aspect-square" : "h-24"
          } ${
            dragging
              ? "border-brand bg-brand-wash text-brand"
              : "border-line text-ink-3 hover:border-line-strong hover:bg-surface"
          } disabled:opacity-50`}
        >
          <svg viewBox="0 0 20 20" className="size-5" fill="none" aria-hidden="true">
            <path
              d="M10 14V4m-4 4 4-4 4 4M3.5 15.5h13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {busy ? "Uploading…" : "Choose or drop an image"}
          <span className="text-[0.625rem] text-ink-3">PNG, JPG or WebP · up to 5 MB</span>
        </button>
      )}

      {error ? (
        <p role="alert" className="text-[0.6875rem] text-bad">
          {error}
        </p>
      ) : null}
    </div>
  );
}
