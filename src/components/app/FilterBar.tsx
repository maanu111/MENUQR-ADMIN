"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { RANGE_LABELS, type RangeKey } from "@/lib/range";

export type SelectFilter = {
  name: string;
  label: string;
  options: { value: string; label: string }[];
};

/**
 * One filter row for every list page: date range, free-text search and any
 * number of dropdowns. State lives in the URL, so a filtered view is
 * shareable, survives refresh, and the export button can reuse it verbatim.
 */
export function FilterBar({
  showRange = true,
  searchPlaceholder,
  selects = [],
  exportPath,
}: {
  showRange?: boolean;
  searchPlaceholder?: string;
  selects?: SelectFilter[];
  /** When set, an Export button links here carrying the same filters. */
  exportPath?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const range = (params.get("range") ?? "today") as RangeKey;
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [from, setFrom] = useState(params.get("from") ?? "");
  const [to, setTo] = useState(params.get("to") ?? "");

  function push(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    /* Any filter change resets paging, or you land on an empty page 4. */
    next.delete("page");
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  }

  const exportHref = exportPath
    ? `${exportPath}?${params.toString()}`
    : undefined;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {showRange ? (
          <select
            value={range}
            aria-label="Date range"
            onChange={(e) => push({ range: e.target.value })}
            className="h-9 rounded-lg border border-line bg-ground px-2.5 text-[0.8125rem] text-ink outline-none focus:border-brand"
          >
            {RANGE_LABELS.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
            <option value="custom">Custom…</option>
          </select>
        ) : null}

        {selects.map((filter) => (
          <select
            key={filter.name}
            value={params.get(filter.name) ?? ""}
            aria-label={filter.label}
            onChange={(e) => push({ [filter.name]: e.target.value || undefined })}
            className="h-9 rounded-lg border border-line bg-ground px-2.5 text-[0.8125rem] text-ink outline-none focus:border-brand"
          >
            <option value="">{filter.label}: all</option>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ))}

        {searchPlaceholder ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              push({ q: query.trim() || undefined });
            }}
            className="flex items-center gap-1.5"
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-9 w-48 rounded-lg border border-line bg-ground px-3 text-[0.8125rem] text-ink outline-none placeholder:text-ink-3 focus:border-brand"
            />
            <button
              type="submit"
              className="rounded-lg border border-line px-3 py-1.5 text-[0.8125rem] font-semibold text-ink-2 transition hover:bg-surface-2"
            >
              Search
            </button>
          </form>
        ) : null}

        {params.toString() ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFrom("");
              setTo("");
              startTransition(() => router.push(pathname));
            }}
            className="text-[0.75rem] font-medium text-ink-3 underline underline-offset-2 transition hover:text-ink"
          >
            Clear
          </button>
        ) : null}

        {exportHref ? (
          <a
            href={exportHref}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[0.8125rem] font-semibold text-ink transition hover:bg-surface-2"
          >
            <svg viewBox="0 0 20 20" className="size-3.5" fill="none" aria-hidden="true">
              <path
                d="M10 3v9m-3.5-3.5L10 12l3.5-3.5M4 16h12"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Export CSV
          </a>
        ) : null}

        {pending ? (
          <span className="text-[0.6875rem] text-ink-3">updating…</span>
        ) : null}
      </div>

      {range === "custom" ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={from}
            aria-label="From date"
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 rounded-lg border border-line bg-ground px-2.5 text-[0.8125rem] text-ink outline-none focus:border-brand"
          />
          <span className="text-[0.75rem] text-ink-3">to</span>
          <input
            type="date"
            value={to}
            aria-label="To date"
            onChange={(e) => setTo(e.target.value)}
            className="h-9 rounded-lg border border-line bg-ground px-2.5 text-[0.8125rem] text-ink outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={() => push({ range: "custom", from, to })}
            className="rounded-lg bg-brand px-3 py-1.5 text-[0.8125rem] font-semibold text-brand-ink transition hover:bg-brand-deep"
          >
            Apply
          </button>
        </div>
      ) : null}
    </div>
  );
}
