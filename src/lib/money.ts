const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** Everything is stored in paise; only the view layer sees rupees. */
export function rupees(paise: number) {
  return `₹${inr.format(Math.round(paise / 100))}`;
}

/** Compact form for chart axes and tiles: ₹52k, ₹1.4L. */
export function rupeesShort(paise: number) {
  const value = paise / 100;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${Math.round(value / 1000)}k`;
  return `₹${Math.round(value)}`;
}

export function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function daysAgo(days: number) {
  const start = startOfToday();
  start.setDate(start.getDate() - days);
  return start;
}
