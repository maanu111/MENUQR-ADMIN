import "server-only";

/** What a restaurant is writing in about. Plain words, not categories. */
export const TICKET_TOPICS = [
  { key: "orders", label: "Orders or the kitchen queue" },
  { key: "menu", label: "Menu, prices or photos" },
  { key: "qr", label: "QR codes or tables" },
  { key: "billing", label: "Payment or my plan" },
  { key: "staff", label: "Staff accounts and access" },
  { key: "general", label: "Something else" },
] as const;

export const TICKET_STATUS_LABEL: Record<string, string> = {
  OPEN: "Waiting on us",
  PENDING: "Waiting on you",
  RESOLVED: "Sorted",
  CLOSED: "Closed",
};

export const TICKET_STATUS_TONE: Record<string, string> = {
  OPEN: "text-warn",
  PENDING: "text-brand",
  RESOLVED: "text-good",
  CLOSED: "text-ink-3",
};

export const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Whenever",
  NORMAL: "Normal",
  HIGH: "Today please",
  URGENT: "We're stuck",
};

export const PRIORITY_TONE: Record<string, string> = {
  LOW: "text-ink-3",
  NORMAL: "text-ink-2",
  HIGH: "text-warn",
  URGENT: "text-bad",
};

export function topicLabel(key: string) {
  return TICKET_TOPICS.find((t) => t.key === key)?.label ?? "Something else";
}

export function since(date: Date) {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}
