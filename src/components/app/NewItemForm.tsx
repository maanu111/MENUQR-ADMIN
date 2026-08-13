"use client";

import { useRef, useState, useTransition } from "react";
import { createCategory, createMenuItem } from "@/app/dashboard/menu/actions";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";

export function NewItemForm({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [badField, setBadField] = useState("");
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  if (categories.length === 0) {
    return <NewCategoryForm hint="Add a section before adding dishes." />;
  }

  if (!open) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="h-9 px-4 text-[0.8125rem]"
        >
          Add a dish
        </Button>
        <NewCategoryForm />
      </div>
    );
  }

  function submit(formData: FormData) {
    setError("");
    setBadField("");
    startTransition(async () => {
      const result = await toast.run(
        () => createMenuItem(formData),
        `${String(formData.get("name") ?? "Dish")} added to the menu`,
      );
      if (!result?.ok) {
        setBadField(result?.field ?? "");
        setError(result?.message ?? "");
        return;
      }
      formRef.current?.reset();
      setOpen(false);
    });
  }

  return (
    <form
      ref={formRef}
      action={submit}
      className="rounded-xl border border-line bg-ground p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field
          id="name"
          name="name"
          label="Dish name"
          placeholder="e.g. Paneer Tikka"
          error={badField === "name"}
        />
        <Field
          id="code"
          name="code"
          label="Kitchen code"
          placeholder="e.g. ST01"
          maxLength={12}
          error={badField === "code"}
        />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="categoryId"
            className="text-[0.8125rem] font-medium text-ink"
          >
            Section
          </label>
          <select
            id="categoryId"
            name="categoryId"
            className="h-11 w-full rounded-xl border border-line bg-ground px-3 text-[0.875rem] text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/12"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <Field
          id="price"
          name="price"
          label="Price"
          hint="₹"
          placeholder="e.g. 340"
          inputMode="decimal"
          error={badField === "price"}
        />
        <Field
          id="cost"
          name="cost"
          label="Cost to make"
          hint="₹ · drives margin"
          placeholder="e.g. 120"
          inputMode="decimal"
          defaultValue="0"
        />
        <Field
          id="prepMinutes"
          name="prepMinutes"
          label="Prep time"
          hint="minutes"
          placeholder="e.g. 18"
          inputMode="numeric"
          defaultValue="15"
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="diet" className="text-[0.8125rem] font-medium text-ink">
            Diet
          </label>
          <select
            id="diet"
            name="diet"
            className="h-11 w-full rounded-xl border border-line bg-ground px-3 text-[0.875rem] text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/12"
          >
            <option value="VEG">Vegetarian</option>
            <option value="NONVEG">Non-vegetarian</option>
            <option value="EGG">Contains egg</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <Field
            id="description"
            name="description"
            label="Description"
            hint="optional"
            placeholder="e.g. Charred cottage cheese, hung curd and ajwain."
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-[0.75rem] text-bad">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex gap-2">
        <Button type="submit" disabled={pending} className="h-10 px-5">
          {pending ? "Saving…" : "Add dish"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setOpen(false)}
          className="h-10 px-5"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function NewCategoryForm({ hint }: { hint?: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        setError("");
        startTransition(async () => {
          const result = await createCategory(formData);
          if (!result.ok) {
            setError(result.message);
            return;
          }
          formRef.current?.reset();
        });
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input
        name="name"
        placeholder={hint ?? "New section"}
        aria-label="New section name"
        className="h-9 w-44 rounded-lg border border-line bg-ground px-3 text-[0.8125rem] text-ink outline-none placeholder:text-ink-3 focus:border-brand"
      />
      <Button
        type="submit"
        variant="secondary"
        disabled={pending}
        className="h-9 px-4 text-[0.8125rem]"
      >
        {pending ? "…" : "Add section"}
      </Button>
      {error ? (
        <span role="alert" className="text-[0.6875rem] text-bad">
          {error}
        </span>
      ) : null}
    </form>
  );
}
