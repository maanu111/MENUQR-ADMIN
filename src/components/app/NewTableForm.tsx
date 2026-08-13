"use client";

import { useRef, useState, useTransition } from "react";
import { createTable } from "@/app/dashboard/tables/actions";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";

export function NewTableForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        setError("");
        startTransition(async () => {
          const result = await toast.run(
            () => createTable(formData),
            "Table " + String(formData.get("number") ?? "") + " added",
          );
          if (!result?.ok) {
            setError(result?.message ?? "");
            return;
          }
          formRef.current?.reset();
        });
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input
        name="number"
        placeholder="e.g. 12"
        aria-label="Table number"
        className="h-9 w-28 rounded-lg border border-line bg-ground px-3 text-[0.8125rem] outline-none placeholder:text-ink-3 focus:border-brand"
      />
      <input
        name="seats"
        defaultValue="4"
        inputMode="numeric"
        aria-label="Seats"
        placeholder="Seats, e.g. 4"
        className="num h-9 w-20 rounded-lg border border-line bg-ground px-3 text-[0.8125rem] outline-none focus:border-brand"
      />
      <input
        name="section"
        placeholder="e.g. Garden side"
        aria-label="Section"
        className="h-9 w-44 rounded-lg border border-line bg-ground px-3 text-[0.8125rem] outline-none placeholder:text-ink-3 focus:border-brand"
      />
      <Button type="submit" disabled={pending} className="h-9 px-4 text-[0.8125rem]">
        {pending ? "Adding…" : "Add table"}
      </Button>
      {error ? (
        <span role="alert" className="text-[0.6875rem] text-bad">
          {error}
        </span>
      ) : null}
    </form>
  );
}
