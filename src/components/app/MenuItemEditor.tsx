"use client";

import { useState, useTransition } from "react";
import { deleteMenuItem, updateMenuItem } from "@/app/dashboard/menu/actions";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";

export type EditableItem = {
  id: string;
  categoryId: string;
  code: string;
  name: string;
  description: string;
  price: string;
  cost: string;
  diet: "VEG" | "NONVEG" | "EGG";
  prepMinutes: string;
  spiceLevel: string;
  imageUrl: string | null;
  isBestseller: boolean;
  isAddOn: boolean;
};

export function MenuItemEditor({
  item,
  categories,
  onDone,
}: {
  item: EditableItem;
  categories: { id: string; name: string }[];
  onDone: () => void;
}) {
  const [values, setValues] = useState(item);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function set<K extends keyof EditableItem>(key: K, value: EditableItem[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setError("");
  }

  function save() {
    startTransition(async () => {
      const result = await toast.run(
        () =>
          updateMenuItem(item.id, {
            categoryId: values.categoryId,
            code: values.code,
            name: values.name,
            description: values.description,
            price: Number(values.price),
            cost: Number(values.cost || 0),
            diet: values.diet,
            prepMinutes: Number(values.prepMinutes || 15),
            spiceLevel: Number(values.spiceLevel || 0),
            imageUrl: values.imageUrl,
            isBestseller: values.isBestseller,
            isAddOn: values.isAddOn,
          }),
        `${values.name} saved`,
      );
      if (!result?.ok) {
        setError(result?.message ?? "");
        return;
      }
      onDone();
    });
  }

  return (
    <div className="rounded-xl border border-line bg-ground p-5">
      <div className="grid gap-5 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <ImageUpload
          value={values.imageUrl}
          onChange={(url) => set("imageUrl", url)}
          folder="dishes"
          label="Photo"
          hint="square, under 150 KB"
          size="large"
        />

        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              id={`name-${item.id}`}
              label="Dish name"
              placeholder="e.g. Paneer Tikka"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
            />
            <Field
              id={`code-${item.id}`}
              label="Kitchen code"
              hint="what staff shout"
              placeholder="e.g. ST01"
              value={values.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
            />
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`cat-${item.id}`}
                className="text-[0.8125rem] font-medium text-ink"
              >
                Section
              </label>
              <select
                id={`cat-${item.id}`}
                value={values.categoryId}
                onChange={(e) => set("categoryId", e.target.value)}
                className="h-11 rounded-xl border border-line bg-ground px-3 text-[0.875rem] text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/12"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Field
              id={`price-${item.id}`}
              label="Price"
              hint="₹ guests pay"
              placeholder="e.g. 340"
              inputMode="decimal"
              value={values.price}
              onChange={(e) => set("price", e.target.value)}
            />
            <Field
              id={`cost-${item.id}`}
              label="Cost to make"
              hint="₹ · drives margin"
              placeholder="e.g. 120"
              inputMode="decimal"
              value={values.cost}
              onChange={(e) => set("cost", e.target.value)}
            />
            <Field
              id={`prep-${item.id}`}
              label="Prep time"
              hint="minutes"
              placeholder="e.g. 18"
              inputMode="numeric"
              value={values.prepMinutes}
              onChange={(e) => set("prepMinutes", e.target.value)}
            />

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`diet-${item.id}`}
                className="text-[0.8125rem] font-medium text-ink"
              >
                Diet
              </label>
              <select
                id={`diet-${item.id}`}
                value={values.diet}
                onChange={(e) =>
                  set("diet", e.target.value as EditableItem["diet"])
                }
                className="h-11 rounded-xl border border-line bg-ground px-3 text-[0.875rem] text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/12"
              >
                <option value="VEG">Vegetarian</option>
                <option value="NONVEG">Non-vegetarian</option>
                <option value="EGG">Contains egg</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`spice-${item.id}`}
                className="text-[0.8125rem] font-medium text-ink"
              >
                Spice
              </label>
              <select
                id={`spice-${item.id}`}
                value={values.spiceLevel}
                onChange={(e) => set("spiceLevel", e.target.value)}
                className="h-11 rounded-xl border border-line bg-ground px-3 text-[0.875rem] text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/12"
              >
                <option value="0">Not spicy</option>
                <option value="1">Mild</option>
                <option value="2">Medium</option>
                <option value="3">Hot</option>
              </select>
            </div>
          </div>

          <Field
            id={`desc-${item.id}`}
            label="Description"
            hint="one line, shown under the name"
            placeholder="e.g. Charred cottage cheese, hung curd and ajwain."
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
          />

          <div className="flex flex-wrap gap-2">
            {[
              { key: "isBestseller" as const, label: "Bestseller" },
              { key: "isAddOn" as const, label: "Offer as an add-on" },
            ].map((flag) => (
              <label
                key={flag.key}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[0.8125rem] transition ${
                  values[flag.key]
                    ? "border-brand bg-brand-wash text-brand"
                    : "border-line text-ink-2 hover:bg-surface-2"
                }`}
              >
                <input
                  type="checkbox"
                  checked={values[flag.key]}
                  onChange={() => set(flag.key, !values[flag.key])}
                  className="size-3.5 rounded border-line accent-brand"
                />
                {flag.label}
              </label>
            ))}
          </div>

          {error ? (
            <p role="alert" className="text-[0.75rem] text-bad">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={save} disabled={pending} className="h-10 px-5">
              {pending ? "Saving…" : "Save dish"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onDone}
              className="h-10 px-5"
            >
              Cancel
            </Button>

            {confirmDelete ? (
              <span className="ml-auto flex items-center gap-2">
                <span className="text-[0.75rem] text-ink-2">Delete for good?</span>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await toast.run(
                        () => deleteMenuItem(item.id),
                        `${values.name} deleted`,
                      );
                      if (!result?.ok) {
                        setError(result?.message ?? "");
                        setConfirmDelete(false);
                        return;
                      }
                      onDone();
                    })
                  }
                  className="h-9 border-bad px-4 text-[0.8125rem] text-bad"
                >
                  Yes, delete
                </Button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-[0.75rem] text-ink-3 hover:text-ink"
                >
                  No
                </button>
              </span>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmDelete(true)}
                className="ml-auto h-9 px-4 text-[0.8125rem]"
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
