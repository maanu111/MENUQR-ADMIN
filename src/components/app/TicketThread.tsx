"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";

export type ThreadMessage = {
  id: string;
  body: string;
  fromStaff: boolean;
  authorName: string;
  createdAt: string;
  ago: string;
};

export type Thread = {
  id: string;
  subject: string;
  topic: string;
  status: string;
  statusLabel: string;
  statusTone: string;
  priorityLabel: string;
  priorityTone: string;
  restaurantName?: string;
  openedBy: string;
  ago: string;
  messages: ThreadMessage[];
};

/**
 * One conversation, read the same way on both sides. Whose message it is
 * shows by side and label, never by colour alone.
 */
export function TicketThread({
  thread,
  onReply,
  onClose,
  replyLabel = "Reply",
  closeLabel = "Mark sorted",
  fromStaff = false,
}: {
  thread: Thread;
  onReply: (body: string) => Promise<{ ok: boolean; message?: string }>;
  onClose?: () => Promise<{ ok: boolean; message?: string }>;
  replyLabel?: string;
  closeLabel?: string;
  fromStaff?: boolean;
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <article className="rounded-xl border border-line bg-ground">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-[0.9375rem] font-semibold text-ink">
            {thread.subject}
          </h3>
          <p className="mt-0.5 text-[0.75rem] text-ink-3">
            {thread.restaurantName ? `${thread.restaurantName} · ` : ""}
            {thread.topic} · opened by {thread.openedBy} {thread.ago}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`text-[0.75rem] font-semibold ${thread.priorityTone}`}>
            {thread.priorityLabel}
          </span>
          <span
            className={`rounded-full border border-line px-2.5 py-1 text-[0.6875rem] font-semibold ${thread.statusTone}`}
          >
            {thread.statusLabel}
          </span>
        </div>
      </header>

      <ol className="flex flex-col gap-3 px-5 py-4">
        {thread.messages.map((message) => {
          const mine = message.fromStaff === fromStaff;
          return (
            <li
              key={message.id}
              className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[42rem] rounded-xl px-4 py-2.5 text-[0.8125rem] leading-relaxed whitespace-pre-wrap ${
                  message.fromStaff
                    ? "bg-brand-wash text-ink"
                    : "bg-surface-2 text-ink"
                }`}
              >
                {message.body}
              </div>
              <span className="mt-1 text-[0.625rem] text-ink-3">
                {message.fromStaff ? "Tablet support" : message.authorName} ·{" "}
                {message.ago}
              </span>
            </li>
          );
        })}
      </ol>

      {thread.status === "CLOSED" ? (
        <p className="border-t border-line px-5 py-3 text-[0.75rem] text-ink-3">
          This conversation is closed. Replying will open it again.
        </p>
      ) : null}

      <div className="flex flex-col gap-2 border-t border-line px-5 py-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder={
            fromStaff
              ? "Reply to the restaurant — plain language, no jargon"
              : "Add anything else that would help us fix it"
          }
          className="w-full rounded-xl border border-line bg-ground px-3.5 py-2.5 text-[0.875rem] text-ink outline-none placeholder:text-ink-3 focus:border-brand focus:ring-4 focus:ring-brand/12"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={pending || body.trim().length < 2}
            onClick={() =>
              startTransition(async () => {
                const result = await toast.run(() => onReply(body), "Reply sent");
                if (result?.ok) setBody("");
              })
            }
            className="h-9 px-4 text-[0.8125rem]"
          >
            {pending ? "Sending…" : replyLabel}
          </Button>

          {onClose && thread.status !== "CLOSED" ? (
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await toast.run(onClose, "Marked sorted");
                })
              }
              className="h-9 px-4 text-[0.8125rem]"
            >
              {closeLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
