"use client";

import { useState, useTransition } from "react";
import { deleteCategory, renameCategory } from "@/app/dashboard/menu/actions";
import { useToast } from "@/components/ui/Toaster";

/**
 * The heading above each menu section, with rename and delete in place.
 * Delete is only offered once the section is empty — the server refuses
 * otherwise, and offering a button that always fails is just noise.
 */
export function CategoryHeader({
  id,
  name,
  count,
}: {
  id: string;
  name: string;
  count: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function save() {
    const next = draft.trim();
    if (next === name) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const result = await toast.run(
        () => renameCategory(id, next),
        `Section renamed to ${next}`,
      );
      if (result?.ok) setEditing(false);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await toast.run(
        () => deleteCategory(id),
        `${name} deleted`,
      );
      if (!result?.ok) setConfirming(false);
    });
  }

  if (editing) {
    return (
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              setDraft(name);
              setEditing(false);
            }
          }}
          autoFocus
          aria-label="Section name"
          placeholder="e.g. Desserts"
          className="h-8 w-48 rounded-lg border border-brand bg-ground px-2.5 text-[0.8125rem] text-ink outline-none placeholder:text-ink-3"
        />
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-lg bg-brand px-2.5 py-1.5 text-[0.625rem] font-semibold text-brand-ink disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(name);
            setEditing(false);
          }}
          className="text-[0.625rem] text-ink-3 hover:text-ink"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="group/sec mb-2 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="Rename this section"
        className="rounded text-[0.8125rem] font-semibold text-ink underline decoration-transparent underline-offset-4 transition hover:decoration-brand"
      >
        {name}
      </button>
      <span className="num text-[0.6875rem] text-ink-3">{count}</span>

      {count === 0 ? (
        confirming ? (
          <span className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="rounded-lg bg-bad px-2.5 py-1 text-[0.625rem] font-semibold text-white disabled:opacity-50"
            >
              {pending ? "Deleting…" : "Delete section"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-[0.625rem] text-ink-3 hover:text-ink"
            >
              Keep
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-[0.625rem] text-ink-3 underline underline-offset-2 opacity-0 transition group-hover/sec:opacity-100 focus:opacity-100 hover:text-bad"
          >
            Delete
          </button>
        )
      ) : null}
    </div>
  );
}
