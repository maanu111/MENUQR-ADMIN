/** Shared date-range parsing for every filtered page and every export. */

export type RangeKey =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "month"
  | "last-month"
  | "90d"
  | "year"
  | "all"
  | "custom";

export const RANGE_LABELS: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "90d", label: "90 days" },
  { key: "year", label: "This year" },
  { key: "all", label: "All time" },
];

function midnight(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export type Resolved = {
  key: RangeKey;
  label: string;
  from: Date;
  to: Date;
  /** Hourly buckets read well for a single day; daily for anything longer. */
  granularity: "hour" | "day" | "month";
};

/**
 * Turns `?range=30d` or `?range=custom&from=…&to=…` into concrete bounds.
 * Unknown values fall back to today rather than throwing at the user.
 */
export function resolveRange(params: {
  range?: string;
  from?: string;
  to?: string;
}): Resolved {
  const now = new Date();
  const key = (params.range ?? "today") as RangeKey;

  const make = (from: Date, to: Date, label: string): Resolved => {
    const days = Math.max(1, Math.round((+to - +from) / 86400000));
    return {
      key,
      label,
      from,
      to,
      granularity: days <= 1 ? "hour" : days <= 92 ? "day" : "month",
    };
  };

  switch (key) {
    case "yesterday": {
      const day = new Date(now);
      day.setDate(day.getDate() - 1);
      return make(midnight(day), endOfDay(day), "Yesterday");
    }
    case "7d": {
      const from = midnight(now);
      from.setDate(from.getDate() - 6);
      return make(from, endOfDay(now), "Last 7 days");
    }
    case "30d": {
      const from = midnight(now);
      from.setDate(from.getDate() - 29);
      return make(from, endOfDay(now), "Last 30 days");
    }
    case "month":
      return make(
        new Date(now.getFullYear(), now.getMonth(), 1),
        endOfDay(now),
        "This month",
      );
    case "last-month": {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
      return make(from, to, "Last month");
    }
    case "90d": {
      const from = midnight(now);
      from.setDate(from.getDate() - 89);
      return make(from, endOfDay(now), "Last 90 days");
    }
    case "year":
      return make(new Date(now.getFullYear(), 0, 1), endOfDay(now), "This year");
    case "all":
      return make(new Date(2000, 0, 1), endOfDay(now), "All time");
    case "custom": {
      const from = params.from ? new Date(params.from) : midnight(now);
      const to = params.to ? endOfDay(new Date(params.to)) : endOfDay(now);
      if (Number.isNaN(+from) || Number.isNaN(+to) || from > to) {
        return make(midnight(now), endOfDay(now), "Today");
      }
      return make(
        midnight(from),
        to,
        `${from.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${to.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
      );
    }
    default:
      return make(midnight(now), endOfDay(now), "Today");
  }
}

/** Rebuilds the querystring while changing one key — used by every filter. */
export function withParam(
  current: Record<string, string | undefined>,
  changes: Record<string, string | undefined>,
) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...changes })) {
    if (value) next.set(key, value);
  }
  const query = next.toString();
  return query ? `?${query}` : "";
}
