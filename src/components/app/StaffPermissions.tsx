"use client";

import { useState, useTransition } from "react";
import { setStaffPages } from "@/app/dashboard/staff/actions";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";

export type PageOption = { key: string; label: string; locked: boolean };

/**
 * Hands one person a specific set of pages. Ticking nothing falls back to the
 * role default, which is what most restaurants will leave it on.
 */
export function StaffPermissions({
  membershipId,
  name,
  role,
  options,
  current,
  usingDefaults,
  onClose,
}: {
  membershipId: string;
  name: string;
  role: string;
  options: PageOption[];
  current: string[];
  usingDefaults: boolean;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set(current));
  const [custom, setCustom] = useState(!usingDefaults);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const toast = useToast();

  function toggle(key: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function save() {
    setError("");
    startTransition(async () => {
      const result = await toast.run(
        () => setStaffPages(membershipId, custom ? [...picked] : null),
        `${name}'s access saved`,
      );
      if (!result?.ok) {
        setError(result?.message ?? "");
        return;
      }
      onClose();
    });
  }

  return (
    <div className="rounded-xl border border-line bg-ground p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[0.875rem] font-semibold text-ink">
          What {name} can open
        </p>
        <span className="text-[0.6875rem] text-ink-3">{role.toLowerCase()}</span>
      </div>

      <div className="mt-3 flex gap-1 rounded-lg bg-surface-2 p-1">
        <button
          type="button"
          onClick={() => setCustom(false)}
          className={`flex-1 rounded-md py-1.5 text-[0.75rem] font-semibold transition ${
            !custom ? "bg-ground text-ink shadow-[0_1px_2px_rgb(11_18_32/0.1)]" : "text-ink-3"
          }`}
        >
          Standard for {role.toLowerCase()}
        </button>
        <button
          type="button"
          onClick={() => setCustom(true)}
          className={`flex-1 rounded-md py-1.5 text-[0.75rem] font-semibold transition ${
            custom ? "bg-ground text-ink shadow-[0_1px_2px_rgb(11_18_32/0.1)]" : "text-ink-3"
          }`}
        >
          Pick pages
        </button>
      </div>

      <div
        className={`mt-3 grid gap-1.5 sm:grid-cols-2 ${custom ? "" : "pointer-events-none opacity-45"}`}
      >
        {options.map((option) => {
          const on = custom ? picked.has(option.key) : current.includes(option.key);
          return (
            <label
              key={option.key}
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[0.8125rem] transition ${
                option.locked
                  ? "border-line opacity-50"
                  : on
                    ? "cursor-pointer border-brand bg-brand-wash text-brand"
                    : "cursor-pointer border-line text-ink-2 hover:bg-surface-2"
              }`}
            >
              <input
                type="checkbox"
                checked={on}
                disabled={!custom || option.locked}
                onChange={() => toggle(option.key)}
                className="size-3.5 rounded border-line accent-brand"
              />
              <span className="flex-1">{option.label}</span>
              {option.locked ? (
                <span className="text-[0.625rem] text-ink-3">not on plan</span>
              ) : null}
            </label>
          );
        })}
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-[0.75rem] text-bad">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <Button type="button" onClick={save} disabled={pending} className="h-9 px-4 text-[0.8125rem]">
          {pending ? "Saving…" : "Save access"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          className="h-9 px-4 text-[0.8125rem]"
        >
          Cancel
        </Button>
      </div>

      <p className="mt-3 text-[0.6875rem] text-ink-3">
        Changes apply on their next click — they don&rsquo;t have to sign out.
      </p>
    </div>
  );
}
