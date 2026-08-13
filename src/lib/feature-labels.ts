/**
 * One place that turns internal keys into words a restaurant owner would use.
 * Nothing in the consoles should ever print a raw key at a human.
 */
export const FEATURE_LABELS: Record<string, string> = {
  menu: "Menu",
  qr: "Table QR codes",
  orders: "Guest ordering",
  kitchen: "Kitchen queue",
  pos: "Counter orders (POS)",
  staff: "Staff accounts",
  inventory: "Inventory",
  offers: "Offers & coupons",
  "reports.daily": "Daily sales report",
  "reports.full": "Full reports & export",
};

/** Slightly longer, for the pricing page where there is room to explain. */
export const FEATURE_BLURBS: Record<string, string> = {
  menu: "Menu and categories",
  qr: "A printable QR for every table",
  orders: "Guest ordering from the table",
  kitchen: "Live kitchen queue",
  pos: "Take orders at the counter and by phone",
  staff: "Staff accounts and what each one can open",
  inventory: "Inventory with low-stock alerts",
  offers: "Offers and coupon codes",
  "reports.daily": "Daily sales report",
  "reports.full": "Full reports, margins and spreadsheet export",
};

export function featureLabel(key: string) {
  return FEATURE_LABELS[key] ?? key;
}
