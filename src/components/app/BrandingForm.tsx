"use client";

import { useState, useTransition } from "react";
import { saveBranding } from "@/app/dashboard/branding/actions";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";

/* Presets are what most owners will actually use; the picker is the escape. */
const PRESETS = [
  { hex: "#C8102E", name: "Crimson" },
  { hex: "#B45309", name: "Amber" },
  { hex: "#15803D", name: "Green" },
  { hex: "#0F766E", name: "Teal" },
  { hex: "#1D4ED8", name: "Blue" },
  { hex: "#6D28D9", name: "Violet" },
  { hex: "#BE185D", name: "Pink" },
  { hex: "#1F2937", name: "Charcoal" },
];

type Values = {
  logoUrl: string | null;
  brandColor: string;
  menuTheme: string;
  menuNote: string;
  tagline: string;
};

export function BrandingForm({
  initial,
  restaurantName,
  previewHref,
}: {
  initial: Values;
  restaurantName: string;
  previewHref: string;
}) {
  const [values, setValues] = useState<Values>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const toast = useToast();

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setSaved(false);
  }

  const dark = values.menuTheme === "dark";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await toast.run(
        () => saveBranding(values),
        "Menu design saved",
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
    <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex flex-col gap-5">
        <div className="rounded-xl border border-line bg-ground p-5">
          <ImageUpload
            value={values.logoUrl}
            onChange={(url) => set("logoUrl", url)}
            folder="logos"
            label="Logo"
            hint="square works best"
          />
        </div>

        <div className="rounded-xl border border-line bg-ground p-5">
          <p className="text-[0.8125rem] font-medium text-ink">Accent colour</p>
          <p className="mt-1 text-[0.75rem] text-ink-3">
            Used for the Add buttons and the price total your guests tap.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.hex}
                type="button"
                title={preset.name}
                onClick={() => set("brandColor", preset.hex)}
                aria-pressed={values.brandColor.toUpperCase() === preset.hex}
                className={`size-9 rounded-lg ring-offset-2 ring-offset-ground transition ${
                  values.brandColor.toUpperCase() === preset.hex
                    ? "ring-2 ring-ink"
                    : "ring-1 ring-line hover:ring-line-strong"
                }`}
                style={{ backgroundColor: preset.hex }}
              >
                <span className="sr-only">{preset.name}</span>
              </button>
            ))}

            <label className="flex items-center gap-2 rounded-lg border border-line px-2.5">
              <input
                type="color"
                value={values.brandColor}
                onChange={(e) => set("brandColor", e.target.value.toUpperCase())}
                aria-label="Custom colour"
                className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              <span className="num text-[0.75rem] text-ink-2">
                {values.brandColor.toUpperCase()}
              </span>
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-ground p-5">
          <p className="text-[0.8125rem] font-medium text-ink">
            How the menu opens
          </p>
          <div className="mt-3 flex gap-1 rounded-lg bg-surface-2 p-1">
            {[
              { key: "light", label: "Light" },
              { key: "dark", label: "Dark" },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => set("menuTheme", option.key)}
                className={`flex-1 rounded-md py-2 text-[0.8125rem] font-semibold transition ${
                  values.menuTheme === option.key
                    ? "bg-ground text-ink shadow-[0_1px_2px_rgb(11_18_32/0.1)]"
                    : "text-ink-3 hover:text-ink-2"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[0.6875rem] text-ink-3">
            Guests can still switch it on their own phone.
          </p>
        </div>

        <div className="grid gap-4 rounded-xl border border-line bg-ground p-5 sm:grid-cols-2">
          <Field
            id="tagline"
            label="Tagline"
            hint="under the name"
            placeholder="e.g. North Indian · Charcoal grill"
            value={values.tagline}
            onChange={(e) => set("tagline", e.target.value)}
          />
          <Field
            id="menuNote"
            label="Welcome line"
            hint="optional"
            placeholder="e.g. Kitchen closes 10:45 pm"
            value={values.menuNote}
            onChange={(e) => set("menuNote", e.target.value)}
          />
        </div>

        {error ? (
          <p role="alert" className="text-[0.75rem] text-bad">
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending} className="h-10 px-5">
            {pending ? "Saving…" : "Save"}
          </Button>
          {saved ? (
            <span role="status" className="text-[0.75rem] font-medium text-good">
              Saved — guests see it on their next refresh
            </span>
          ) : null}
          <a
            href={previewHref}
            target="_blank"
            rel="noreferrer"
            className="ml-auto text-[0.8125rem] font-medium text-brand hover:underline"
          >
            Open the live menu →
          </a>
        </div>
      </div>

      {/* ------------------------------------------------------- Live preview */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-2 text-[0.75rem] font-medium text-ink-2">
          How guests will see it
        </p>
        <div
          className="overflow-hidden rounded-[1.6rem] border-4 shadow-[0_18px_40px_-22px_rgb(11_18_32/0.4)]"
          style={{
            borderColor: dark ? "#131010" : "#e9e2e3",
            background: dark ? "#131010" : "#ffffff",
          }}
        >
          <div
            className="flex items-center gap-2.5 border-b px-3.5 py-3"
            style={{ borderColor: dark ? "#322b2d" : "#ece5e6" }}
          >
            {values.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={values.logoUrl}
                alt=""
                className="size-8 shrink-0 rounded-lg object-contain"
              />
            ) : (
              <span
                className="grid size-8 shrink-0 place-items-center rounded-lg text-[0.625rem] font-bold text-white"
                style={{ backgroundColor: values.brandColor }}
              >
                {restaurantName.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span
                className="block truncate text-[0.8125rem] font-semibold"
                style={{ color: dark ? "#f5f0f1" : "#1a1315" }}
              >
                {restaurantName}
              </span>
              <span
                className="block truncate text-[0.625rem]"
                style={{ color: dark ? "#7c7175" : "#9b8d90" }}
              >
                {values.tagline || "Your tagline"}
              </span>
            </span>
          </div>

          <div className="px-3.5 py-3">
            {values.menuNote ? (
              <p
                className="mb-3 rounded-lg px-2.5 py-1.5 text-[0.625rem]"
                style={{
                  backgroundColor: `${values.brandColor}14`,
                  color: values.brandColor,
                }}
              >
                {values.menuNote}
              </p>
            ) : null}

            {["Paneer Tikka", "Butter Chicken"].map((dish, i) => (
              <div
                key={dish}
                className="flex items-center gap-3 border-b py-2.5 last:border-b-0"
                style={{ borderColor: dark ? "#262122" : "#f1ecec" }}
              >
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate text-[0.75rem] font-semibold"
                    style={{ color: dark ? "#f5f0f1" : "#1a1315" }}
                  >
                    {dish}
                  </span>
                  <span
                    className="num block text-[0.6875rem]"
                    style={{ color: dark ? "#a2969a" : "#6a5c5f" }}
                  >
                    ₹{i === 0 ? "340" : "520"}
                  </span>
                </span>
                <span
                  className="rounded-full px-3 py-1 text-[0.625rem] font-bold text-white"
                  style={{ backgroundColor: values.brandColor }}
                >
                  ADD
                </span>
              </div>
            ))}

            <div
              className="mt-3 flex items-center justify-between rounded-full px-3 py-2"
              style={{ backgroundColor: values.brandColor }}
            >
              <span className="text-[0.625rem] font-bold text-white">
                View order
              </span>
              <span className="num text-[0.625rem] font-bold text-white">₹860</span>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
