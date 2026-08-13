"use client";

import { useState, useTransition } from "react";
import {
  deleteTable,
  setTableActive,
  updateTable,
} from "@/app/dashboard/tables/actions";
import { useToast } from "@/components/ui/Toaster";

export type TableCardData = {
  id: string;
  number: string;
  seats: number;
  section: string | null;
  isActive: boolean;
};

export function TableCard({ table }: { table: TableCardData }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({
    number: table.number,
    seats: String(table.seats),
    section: table.section ?? "",
  });
  const toast = useToast();

  return (
    <article
      className={`flex flex-col rounded-xl border bg-ground p-4 ${
        table.isActive ? "border-line" : "border-line opacity-60"
      }`}
    >
      {editing ? (
        <div className="flex flex-col gap-2">
          <input
            value={draft.number}
            onChange={(e) => setDraft((d) => ({ ...d, number: e.target.value }))}
            placeholder="Table number, e.g. 12"
            aria-label="Table number"
            className="h-9 w-full rounded-lg border border-line bg-ground px-3 text-[0.8125rem] outline-none placeholder:text-ink-3 focus:border-brand"
          />
          <input
            value={draft.seats}
            onChange={(e) => setDraft((d) => ({ ...d, seats: e.target.value }))}
            inputMode="numeric"
            placeholder="Seats, e.g. 4"
            aria-label="Seats"
            className="num h-9 w-full rounded-lg border border-line bg-ground px-3 text-[0.8125rem] outline-none placeholder:font-sans placeholder:text-ink-3 focus:border-brand"
          />
          <input
            value={draft.section}
            onChange={(e) => setDraft((d) => ({ ...d, section: e.target.value }))}
            placeholder="Section, e.g. Garden side"
            aria-label="Section"
            className="h-9 w-full rounded-lg border border-line bg-ground px-3 text-[0.8125rem] outline-none placeholder:text-ink-3 focus:border-brand"
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await toast.run(
                    () =>
                      updateTable(table.id, {
                        number: draft.number,
                        seats: Number(draft.seats),
                        section: draft.section,
                      }),
                    `Table ${draft.number} saved`,
                  );
                  if (!result?.ok) {
                    setError(result?.message ?? "");
                    return;
                  }
                  setError("");
                  setEditing(false);
                })
              }
              className="flex-1 rounded-lg bg-brand py-1.5 text-[0.625rem] font-semibold text-brand-ink disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError("");
              }}
              className="rounded-lg border border-line px-3 py-1.5 text-[0.625rem] font-semibold text-ink-2"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
      <div className="flex items-baseline gap-2">
        <span className="eyebrow text-ink-3">Table</span>
        <span className="num text-xl leading-none font-semibold text-ink">
          {table.number}
        </span>
        <span className="num ml-auto text-[0.625rem] text-ink-3">
          {table.seats} seats
        </span>
      </div>
      )}

      {table.section ? (
        <p className="mt-1 truncate text-[0.6875rem] text-ink-3">{table.section}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-3">
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          className="rounded-lg border border-line px-2.5 py-1.5 text-[0.625rem] font-semibold text-ink-2 transition hover:bg-surface-2"
        >
          Edit
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await toast.run(
                () => setTableActive(table.id, !table.isActive),
                table.isActive
                  ? `Table ${table.number} retired`
                  : `Table ${table.number} reopened`,
              );
            })
          }
          className="rounded-lg border border-line px-2.5 py-1.5 text-[0.625rem] font-semibold text-ink-2 transition hover:bg-surface-2 disabled:opacity-50"
        >
          {table.isActive ? "Retire" : "Reopen"}
        </button>

        {removing ? (
          <span className="flex w-full items-center gap-1.5 pt-1">
            <span className="text-[0.625rem] text-warn">
              Delete this table?
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await toast.run(
                    () => deleteTable(table.id),
                    `Table ${table.number} deleted`,
                  );
                  if (!result?.ok) {
                    setError(result?.message ?? "");
                    setRemoving(false);
                  }
                })
              }
              className="ml-auto rounded-lg bg-bad px-2.5 py-1.5 text-[0.625rem] font-semibold text-white disabled:opacity-50"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setRemoving(false)}
              className="text-[0.625rem] text-ink-3 hover:text-ink"
            >
              Keep
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setRemoving(true)}
            className="rounded-lg border border-line px-2.5 py-1.5 text-[0.625rem] font-semibold text-ink-3 transition hover:border-bad hover:text-bad"
          >
            Delete
          </button>
        )}

        {error ? (
          <p role="alert" className="w-full pt-1 text-[0.625rem] text-bad">
            {error}
          </p>
        ) : null}
      </div>
    </article>
  );
}
