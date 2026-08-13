"use client";

import { useState, useTransition } from "react";
import { saveRestaurant } from "@/app/dashboard/settings/actions";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";

type Values = {
  name: string;
  slug: string;
  fssai: string;
  gstPercent: string;
  serviceHours: string;
  isOpen: boolean;
  acceptsDelivery: boolean;
  deliveryNote: string;
  deliveryMin: string;
};

export function RestaurantForm({
  initial,
  guestHost,
  hasPrintedCodes,
}: {
  initial: Values;
  /** e.g. "tablet.app" or "localhost:3003" — shown so the URL is concrete. */
  guestHost: string;
  hasPrintedCodes: boolean;
}) {
  const [values, setValues] = useState<Values>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [badField, setBadField] = useState("");
  const toast = useToast();

  const slugChanged = values.slug.trim() !== initial.slug;

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setError("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBadField("");
    startTransition(async () => {
      const result = await toast.run(
        () =>
          saveRestaurant({
            name: values.name,
            slug: values.slug,
            fssai: values.fssai,
            gstPercent: Number(values.gstPercent),
            serviceHours: values.serviceHours,
            isOpen: values.isOpen,
            acceptsDelivery: values.acceptsDelivery,
            deliveryNote: values.deliveryNote,
            deliveryMin: Number(values.deliveryMin) || 0,
          }),
        "Restaurant details saved",
      );
      if (!result?.ok) {
        setBadField(
          (result as { field?: string } | null)?.field ?? "",
        );
        setError(result?.message ?? "");
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex max-w-3xl flex-col gap-5">
      <div className="rounded-xl border border-line bg-ground p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="name"
            label="Restaurant name"
            hint="shown on the guest menu"
            placeholder="e.g. Kesar Tandoor"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            error={badField === "name"}
          />
          <Field
            id="serviceHours"
            label="Service hours"
            hint="free text"
            placeholder="e.g. 12:00 pm – 11:30 pm"
            value={values.serviceHours}
            onChange={(e) => set("serviceHours", e.target.value)}
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            id="gstPercent"
            label="GST rate"
            hint="% added at checkout"
            placeholder="e.g. 5"
            inputMode="numeric"
            value={values.gstPercent}
            onChange={(e) => set("gstPercent", e.target.value)}
            error={badField === "gstPercent"}
          />
          <Field
            id="fssai"
            label="FSSAI licence"
            hint="printed on the menu footer"
            placeholder="e.g. 11522004000237"
            inputMode="numeric"
            value={values.fssai}
            onChange={(e) => set("fssai", e.target.value)}
          />
        </div>
      </div>

      {/* ------------------------------------------------------ Web address */}
      <div className="rounded-xl border border-line bg-ground p-5">
        <Field
          id="slug"
          label="Web address"
          hint="your guests' menu lives here"
          placeholder="e.g. kesar-tandoor"
          value={values.slug}
          onChange={(e) => set("slug", e.target.value.toLowerCase())}
          error={badField === "slug"}
        />
        <p className="num mt-2 text-[0.75rem] text-ink-2">
          https://<b className="text-ink">{values.slug || "your-restaurant"}</b>.
          {guestHost}/t/…
        </p>

        {slugChanged && hasPrintedCodes ? (
          <p className="mt-3 rounded-lg border border-warn/40 bg-warn/5 px-3 py-2 text-[0.75rem] text-ink">
            Changing this changes every table&rsquo;s QR link. Codes already
            printed and stuck on tables will stop working — you&rsquo;d need to
            reprint them all.
          </p>
        ) : null}
      </div>

      {/* --------------------------------------------------- Open or closed */}
      <div className="flex items-center gap-3 rounded-xl border border-line bg-ground p-5">
        <button
          type="button"
          role="switch"
          aria-checked={values.isOpen}
          onClick={() => set("isOpen", !values.isOpen)}
          className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${
            values.isOpen ? "bg-good" : "bg-line-strong"
          }`}
        >
          <span
            className={`size-5 rounded-full bg-white transition-transform ${
              values.isOpen ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.8125rem] font-medium text-ink">
            {values.isOpen ? "Taking orders" : "Closed"}
          </span>
          <span className="block text-[0.75rem] text-ink-3">
            {values.isOpen
              ? "Guests can scan and order right now."
              : "Guests can still read the menu, but the header shows you as closed."}
          </span>
        </span>
      </div>

      {/* ------------------------------------------------------- Delivery */}
      <div className="rounded-xl border border-line bg-ground p-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={values.acceptsDelivery}
            onClick={() => set("acceptsDelivery", !values.acceptsDelivery)}
            className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${
              values.acceptsDelivery ? "bg-good" : "bg-line-strong"
            }`}
          >
            <span
              className={`size-5 rounded-full bg-white transition-transform ${
                values.acceptsDelivery ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.8125rem] font-medium text-ink">
              {values.acceptsDelivery ? "Taking delivery orders" : "Dine-in only"}
            </span>
            <span className="block text-[0.75rem] text-ink-3">
              {values.acceptsDelivery
                ? "Guests can order to an address as well as at a table."
                : "Guests can only order from a table they are sitting at."}
            </span>
          </span>
        </div>

        {values.acceptsDelivery ? (
          <div className="mt-4 flex flex-col gap-3.5 border-t border-line pt-4">
            <Field
              id="deliveryNote"
              label="Your delivery terms"
              hint="guests read this before ordering"
              placeholder="e.g. Within 4 km. ₹30 delivery. Usually 35–45 minutes."
              maxLength={300}
              value={values.deliveryNote}
              onChange={(e) => set("deliveryNote", e.target.value)}
            />
            <Field
              id="deliveryMin"
              label="Minimum order"
              hint="₹, leave 0 for none"
              placeholder="e.g. 300"
              inputMode="numeric"
              value={values.deliveryMin}
              onChange={(e) => set("deliveryMin", e.target.value)}
            />
            <p className="rounded-lg border border-warn/40 bg-warn/5 px-3 py-2 text-[0.75rem] leading-relaxed text-ink">
              You deliver these orders yourself. Guests are shown your name and
              your terms, and they call you — not us — about a delivery. Set out
              your area, charge and timing above so nobody is surprised.
            </p>
          </div>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-[0.75rem] text-bad">
          {error}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={pending} className="h-10 px-5">
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
