"use client";

import { useState, useTransition } from "react";
import {
  createBanner,
  deleteBanner,
  moveBanner,
  setBannerActive,
  updateBanner,
} from "@/app/dashboard/banners/actions";
import { BannerRail, type BannerSlide } from "@/components/app/BannerRail";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { useToast } from "@/components/ui/Toaster";

export type BannerRow = BannerSlide & { isActive: boolean };

const BLANK = { imageUrl: null as string | null, headline: "", subtext: "", code: "" };

export function BannerBoard({
  banners,
  brandColor,
}: {
  banners: BannerRow[];
  brandColor: string;
}) {
  const [draft, setDraft] = useState(BLANK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const toast = useToast();

  const live = banners.filter((b) => b.isActive);

  /* What the guest is looking at right now, plus whatever is being typed —
     so the owner sees the slide before anyone else does. */
  const preview: BannerSlide[] = editingId
    ? live.map((b) => (b.id === editingId ? { ...b, ...draft } : b))
    : [...live, ...(draft.imageUrl || draft.headline || draft.subtext
        ? [{ id: "draft", ...draft }]
        : [])];

  function reset() {
    setDraft(BLANK);
    setEditingId(null);
    setError("");
  }

  function save() {
    setError("");
    startTransition(async () => {
      const result = await toast.run(
        () =>
          editingId
            ? updateBanner(editingId, draft)
            : createBanner(draft),
        editingId ? "Banner updated" : "Banner added",
      );
      if (!result?.ok) {
        setError(result?.message ?? "");
        return;
      }
      reset();
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      {/* ------------------------------------------------------ The slides */}
      <div className="flex flex-col gap-4">
        <section className="rounded-xl border border-line bg-ground p-5">
          <h2 className="text-[0.8125rem] font-semibold text-ink">
            {editingId ? "Edit this banner" : "Add a banner"}
          </h2>
          <p className="mt-1 text-[0.75rem] text-ink-2">
            Use a picture, a line of text, or both. Guests see these sliding
            across the top of your menu.
          </p>

          <div className="mt-4 flex flex-col gap-3.5">
            <ImageUpload
              value={draft.imageUrl}
              onChange={(url) => setDraft((d) => ({ ...d, imageUrl: url }))}
              folder="banners"
              label="Picture"
              hint="Wide images look best — around 1200 × 500"
              aspect="wide"
            />

            <Field
              id="banner-headline"
              label="Headline"
              hint="optional"
              value={draft.headline}
              maxLength={80}
              onChange={(e) =>
                setDraft((d) => ({ ...d, headline: e.target.value }))
              }
              placeholder="e.g. 20% off every weekday lunch"
            />

            <Field
              id="banner-subtext"
              label="Smaller line"
              hint="optional"
              value={draft.subtext}
              maxLength={140}
              onChange={(e) =>
                setDraft((d) => ({ ...d, subtext: e.target.value }))
              }
              placeholder="e.g. Monday to Friday, 12pm – 4pm"
            />

            <Field
              id="banner-code"
              label="Promo code to show"
              hint="optional"
              value={draft.code}
              maxLength={24}
              onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
              placeholder="e.g. LUNCH20"
            />
            <p className="-mt-1 text-[0.6875rem] text-ink-3">
              Showing a code here does not create it. Make it on the Offers page
              first, or guests will be told it isn&rsquo;t valid.
            </p>

            {error ? (
              <p role="alert" className="text-[0.75rem] text-bad">
                {error}
              </p>
            ) : null}

            <div className="flex gap-2">
              <Button type="button" onClick={save} disabled={pending}>
                {pending
                  ? "Saving…"
                  : editingId
                    ? "Save changes"
                    : "Add banner"}
              </Button>
              {editingId ? (
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-lg border border-line px-4 py-2 text-[0.8125rem] font-semibold text-ink-2 transition hover:bg-surface-2"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {banners.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-ground px-4 py-8 text-center text-[0.8125rem] text-ink-3">
            No banners yet. The strip stays hidden on the guest menu until you
            add one.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {banners.map((banner, index) => (
              <li
                key={banner.id}
                className={`flex items-center gap-3 rounded-xl border border-line bg-ground p-3 ${
                  banner.isActive ? "" : "opacity-55"
                }`}
              >
                <span className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    disabled={index === 0 || pending}
                    aria-label="Move up"
                    onClick={() =>
                      startTransition(async () => {
                        await toast.run(
                          () => moveBanner(banner.id, "up"),
                          "Moved up",
                        );
                      })
                    }
                    className="rounded px-1 text-[0.75rem] text-ink-3 transition hover:text-ink disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={index === banners.length - 1 || pending}
                    aria-label="Move down"
                    onClick={() =>
                      startTransition(async () => {
                        await toast.run(
                          () => moveBanner(banner.id, "down"),
                          "Moved down",
                        );
                      })
                    }
                    className="rounded px-1 text-[0.75rem] text-ink-3 transition hover:text-ink disabled:opacity-30"
                  >
                    ▼
                  </button>
                </span>

                {banner.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={banner.imageUrl}
                    alt=""
                    className="h-12 w-20 shrink-0 rounded-lg border border-line object-cover"
                  />
                ) : (
                  <span className="grid h-12 w-20 shrink-0 place-items-center rounded-lg border border-dashed border-line text-[0.625rem] text-ink-3">
                    text only
                  </span>
                )}

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.8125rem] font-medium text-ink">
                    {banner.headline || banner.subtext || "Picture only"}
                  </span>
                  {banner.code ? (
                    <span className="num mt-0.5 inline-block rounded bg-brand-wash px-1.5 py-0.5 text-[0.625rem] font-semibold text-brand">
                      {banner.code}
                    </span>
                  ) : null}
                </span>

                <button
                  type="button"
                  role="switch"
                  aria-checked={banner.isActive}
                  aria-label={
                    banner.isActive ? "Showing to guests" : "Hidden from guests"
                  }
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await toast.run(
                        () => setBannerActive(banner.id, !banner.isActive),
                        banner.isActive ? "Banner paused" : "Banner is live",
                      );
                    })
                  }
                  className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition disabled:opacity-50 ${
                    banner.isActive ? "bg-brand" : "bg-line-strong"
                  }`}
                >
                  <span
                    className={`size-5 rounded-full bg-white transition ${
                      banner.isActive ? "translate-x-5" : ""
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingId(banner.id);
                    setDraft({
                      imageUrl: banner.imageUrl ?? null,
                      headline: banner.headline ?? "",
                      subtext: banner.subtext ?? "",
                      code: banner.code ?? "",
                    });
                    setError("");
                  }}
                  className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-[0.6875rem] font-semibold text-ink-2 transition hover:bg-surface-2"
                >
                  Edit
                </button>

                <DeleteBanner id={banner.id} disabled={pending} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ----------------------------------------------------- Live preview */}
      <aside className="h-fit lg:sticky lg:top-6">
        <h2 className="text-[0.8125rem] font-semibold text-ink">
          What guests see
        </h2>
        <p className="mt-1 text-[0.75rem] text-ink-2">
          The real strip, in your colours. It slides on its own every few
          seconds, and guests can swipe it.
        </p>

        <div
          className="mt-3 rounded-2xl border border-line bg-surface p-3"
          style={{ ["--accent" as string]: brandColor }}
        >
          {preview.length === 0 ? (
            <p className="py-10 text-center text-[0.75rem] text-ink-3">
              Nothing to show yet — the strip stays hidden.
            </p>
          ) : (
            <BannerRail banners={preview} />
          )}
        </div>
      </aside>
    </div>
  );
}

/** Deleting is one click away but asks first — a banner can't be undeleted. */
function DeleteBanner({ id, disabled }: { id: string; disabled: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={disabled}
        className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-[0.6875rem] font-semibold text-ink-3 transition hover:border-bad hover:text-bad disabled:opacity-50"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await toast.run(
              () => deleteBanner(id),
              "Banner deleted",
            );
            if (!result?.ok) setConfirming(false);
          })
        }
        className="rounded-lg bg-bad px-2.5 py-1.5 text-[0.6875rem] font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-[0.6875rem] text-ink-3 hover:text-ink"
      >
        Keep
      </button>
    </span>
  );
}
