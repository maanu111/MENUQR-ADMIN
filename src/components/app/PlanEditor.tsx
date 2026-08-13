"use client";

import { useState, useTransition } from "react";
import {
  createPlan,
  deletePlan,
  setPlanArchived,
  updatePlan,
} from "@/app/admin/actions";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { rupees } from "@/lib/money";
import { featureLabel } from "@/lib/feature-labels";

export type PlanRow = {
  id: string;
  tier: string;
  name: string;
  blurb: string | null;
  pricePaise: number;
  maxOutlets: number;
  maxTables: number;
  features: string[];
  isArchived: boolean;
  sortOrder: number;
  subscribers: number;
};

/** Plain-English labels — the person editing plans isn't reading code. */
const FEATURE_LABELS: { key: string; label: string }[] = [
  { key: "menu", label: "Menu & categories" },
  { key: "qr", label: "Table QR codes" },
  { key: "orders", label: "Guest ordering" },
  { key: "kitchen", label: "Kitchen queue" },
  { key: "pos", label: "POS / counter orders" },
  { key: "staff", label: "Staff & roles" },
  { key: "inventory", label: "Inventory" },
  { key: "offers", label: "Offers & coupons" },
  { key: "reports.daily", label: "Daily report only" },
  { key: "reports.full", label: "Full reports & export" },
];

const BLANK = {
  name: "",
  blurb: "",
  priceRupees: "",
  maxOutlets: "1",
  maxTables: "20",
  features: ["menu", "qr", "orders", "kitchen"] as string[],
};

function Form({
  initial,
  planId,
  onDone,
}: {
  initial: typeof BLANK;
  planId?: string;
  onDone: () => void;
}) {
  const [values, setValues] = useState(initial);
  const [more, setMore] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const toast = useToast();

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setError("");
  }

  function toggleFeature(key: string) {
    setValues((v) => ({
      ...v,
      features: v.features.includes(key)
        ? v.features.filter((f) => f !== key)
        : [...v.features, key],
    }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: values.name,
      blurb: values.blurb,
      priceRupees: Number(values.priceRupees || 0),
      maxOutlets: Number(values.maxOutlets || 1),
      maxTables: Number(values.maxTables || 1),
      features: values.features,
    };

    startTransition(async () => {
      const result = await toast.run(
        () => (planId ? updatePlan(planId, payload) : createPlan(payload)),
        planId ? `${payload.name} updated` : `${payload.name} created`,
      );
      if (!result?.ok) {
        setError(result?.message ?? "");
        return;
      }
      onDone();
    });
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-line bg-ground p-5">
      {/* Two questions up front. Everything else has a sane default and
          lives behind "More options" so the page reads as one decision. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="name"
          label="Plan name"
          hint="what the restaurant sees"
          placeholder="e.g. Growth"
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
        />
        <Field
          id="priceRupees"
          label="Price per month"
          hint="₹ · leave 0 for custom pricing"
          placeholder="e.g. 2499"
          inputMode="decimal"
          value={values.priceRupees}
          onChange={(e) => set("priceRupees", e.target.value)}
        />
      </div>

      <fieldset className="mt-5">
        <legend className="text-[0.8125rem] font-medium text-ink">
          What this plan unlocks
        </legend>
        <p className="mt-1 text-[0.75rem] text-ink-3">
          Anything unticked is hidden from restaurants on this plan.
        </p>
        <div className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_LABELS.map((feature) => {
            const on = values.features.includes(feature.key);
            return (
              <label
                key={feature.key}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-[0.8125rem] transition ${
                  on
                    ? "border-brand bg-brand-wash text-brand"
                    : "border-line text-ink-2 hover:bg-surface-2"
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleFeature(feature.key)}
                  className="size-3.5 rounded border-line accent-brand"
                />
                {feature.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 border-t border-line pt-4">
        <button
          type="button"
          onClick={() => setMore((m) => !m)}
          className="flex items-center gap-1.5 text-[0.75rem] font-medium text-ink-2 transition hover:text-ink"
        >
          <svg
            viewBox="0 0 16 16"
            className={`size-3 transition-transform ${more ? "rotate-90" : ""}`}
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M6 3l5 5-5 5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          More options
        </button>

        {more ? (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field
              id="maxOutlets"
              label="Outlets allowed"
              hint="branches on one account"
              placeholder="e.g. 3"
              inputMode="numeric"
              value={values.maxOutlets}
              onChange={(e) => set("maxOutlets", e.target.value)}
            />
            <Field
              id="maxTables"
              label="Tables allowed"
              hint="per outlet"
              placeholder="e.g. 1000"
              inputMode="numeric"
              value={values.maxTables}
              onChange={(e) => set("maxTables", e.target.value)}
            />
            <div className="sm:col-span-2">
              <Field
                id="blurb"
                label="One-line description"
                hint="optional, shown on the pricing page"
                placeholder="e.g. A busy floor with real staff."
                value={values.blurb}
                onChange={(e) => set("blurb", e.target.value)}
              />
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-[0.75rem] text-bad">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex gap-2">
        <Button type="submit" disabled={pending} className="h-10 px-5">
          {pending ? "Saving…" : planId ? "Save plan" : "Create plan"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onDone}
          className="h-10 px-5"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function PlanManager({ plans }: { plans: PlanRow[] }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <div className="flex flex-col gap-5">
      {creating ? (
        <Form initial={BLANK} onDone={() => setCreating(false)} />
      ) : (
        <div>
          <Button
            type="button"
            onClick={() => setCreating(true)}
            className="h-9 px-4 text-[0.8125rem]"
          >
            New plan
          </Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) =>
          editing === plan.id ? (
            <div key={plan.id} className="lg:col-span-2 xl:col-span-3">
              <Form
                planId={plan.id}
                onDone={() => setEditing(null)}
                initial={{
                  name: plan.name,
                  blurb: plan.blurb ?? "",
                  priceRupees: String(plan.pricePaise / 100),
                  maxOutlets: String(plan.maxOutlets),
                  maxTables: String(plan.maxTables),
                  features: plan.features,
                }}
              />
            </div>
          ) : (
            <article
              key={plan.id}
              className={`flex flex-col rounded-xl border bg-ground p-5 ${
                plan.isArchived ? "border-line opacity-60" : "border-line"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-[0.9375rem] font-semibold text-ink">
                  {plan.name}
                </h2>
                {plan.isArchived ? (
                  <span className="eyebrow text-ink-3">archived</span>
                ) : null}
              </div>

              {plan.blurb ? (
                <p className="mt-1 text-[0.75rem] text-ink-3">{plan.blurb}</p>
              ) : null}

              <p className="num mt-3 text-xl font-semibold text-ink">
                {plan.pricePaise === 0 ? "Custom" : `${rupees(plan.pricePaise)}/mo`}
              </p>

              <p className="num mt-1 text-[0.75rem] text-ink-3">
                {plan.subscribers} subscribed · up to {plan.maxOutlets} outlets,{" "}
                {plan.maxTables} tables
              </p>

              <ul className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-4">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="rounded-full border border-line px-2 py-0.5 text-[0.625rem] text-ink-2"
                  >
                    {featureLabel(f)}
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditing(plan.id)}
                  className="h-8 px-3 text-[0.6875rem]"
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await toast.run(
                        () => setPlanArchived(plan.id, !plan.isArchived),
                        plan.isArchived
                          ? `${plan.name} is back on sale`
                          : `${plan.name} archived`,
                      );
                    })
                  }
                  className="h-8 px-3 text-[0.6875rem]"
                >
                  {plan.isArchived ? "Unarchive" : "Archive"}
                </Button>

                {confirmDelete === plan.id ? (
                  <span className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const result = await toast.run(
                            () => deletePlan(plan.id),
                            `${plan.name} deleted`,
                          );
                          if (result?.ok) setConfirmDelete(null);
                        })
                      }
                      className="h-8 border-bad px-3 text-[0.6875rem] text-bad"
                    >
                      Delete for good
                    </Button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(null)}
                      className="text-[0.6875rem] text-ink-3 hover:text-ink"
                    >
                      No
                    </button>
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setConfirmDelete(plan.id)}
                    className="h-8 px-3 text-[0.6875rem]"
                  >
                    Delete
                  </Button>
                )}
              </div>

              {plan.isArchived ? (
                <p className="mt-3 text-[0.6875rem] text-ink-3">
                  Hidden from the pricing page. Restaurants already on it keep it.
                </p>
              ) : null}
            </article>
          ),
        )}
      </div>
    </div>
  );
}
