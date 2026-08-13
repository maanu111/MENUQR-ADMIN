"use client";

import { useState, useTransition } from "react";
import {
  closeTicket,
  openTicket,
  replyToTicket,
} from "@/app/dashboard/support/actions";
import { TicketThread, type Thread } from "./TicketThread";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";

const TOPICS = [
  { key: "orders", label: "Orders or the kitchen queue" },
  { key: "menu", label: "Menu, prices or photos" },
  { key: "qr", label: "QR codes or tables" },
  { key: "billing", label: "Payment or my plan" },
  { key: "staff", label: "Staff accounts and access" },
  { key: "general", label: "Something else" },
];

const URGENCY = [
  { key: "LOW", label: "Whenever you can" },
  { key: "NORMAL", label: "Normal" },
  { key: "HIGH", label: "Today please" },
  { key: "URGENT", label: "We're stuck right now" },
];

/** The restaurant's side: ask a question, then keep the conversation. */
export function SupportBoard({ threads }: { threads: Thread[] }) {
  const [asking, setAsking] = useState(threads.length === 0);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("orders");
  const [priority, setPriority] = useState("NORMAL");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function send() {
    setError("");
    startTransition(async () => {
      const result = await toast.run(
        () => openTicket({ subject, category, priority, body }),
        "Sent — we'll come back to you here",
      );
      if (!result?.ok) {
        setError(result?.message ?? "");
        return;
      }
      setSubject("");
      setBody("");
      setAsking(false);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {asking ? (
        <div className="rounded-xl border border-line bg-ground p-5">
          <p className="text-[0.875rem] font-semibold text-ink">
            What can we help with?
          </p>
          <p className="mt-1 text-[0.75rem] text-ink-3">
            Write it however you&rsquo;d say it out loud. A real person reads these.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              id="subject"
              label="In one line"
              placeholder="e.g. Table 6 QR opens the wrong menu"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="category"
                className="text-[0.8125rem] font-medium text-ink"
              >
                What is it about?
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-11 rounded-xl border border-line bg-ground px-3 text-[0.875rem] text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/12"
              >
                {TOPICS.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            <label htmlFor="body" className="text-[0.8125rem] font-medium text-ink">
              What happened?
            </label>
            <textarea
              id="body"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="e.g. A guest scanned the code on table 6 at about 8pm and got Cafe Mango's menu instead of ours. It happened twice."
              className="w-full rounded-xl border border-line bg-ground px-3.5 py-2.5 text-[0.875rem] text-ink outline-none placeholder:text-ink-3 focus:border-brand focus:ring-4 focus:ring-brand/12"
            />
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            <span className="text-[0.8125rem] font-medium text-ink">
              How urgent?
            </span>
            <div className="flex flex-wrap gap-1.5">
              {URGENCY.map((u) => (
                <button
                  key={u.key}
                  type="button"
                  onClick={() => setPriority(u.key)}
                  className={`rounded-lg border px-3 py-2 text-[0.8125rem] font-medium transition ${
                    priority === u.key
                      ? "border-brand bg-brand-wash text-brand"
                      : "border-line text-ink-2 hover:bg-surface-2"
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <p role="alert" className="mt-3 text-[0.75rem] text-bad">
              {error}
            </p>
          ) : null}

          <div className="mt-5 flex gap-2">
            <Button
              type="button"
              onClick={send}
              disabled={pending}
              className="h-10 px-5"
            >
              {pending ? "Sending…" : "Send to support"}
            </Button>
            {threads.length > 0 ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAsking(false)}
                className="h-10 px-5"
              >
                Cancel
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <div>
          <Button
            type="button"
            onClick={() => setAsking(true)}
            className="h-9 px-4 text-[0.8125rem]"
          >
            Ask for help
          </Button>
        </div>
      )}

      {threads.map((thread) => (
        <TicketThread
          key={thread.id}
          thread={thread}
          onReply={(text) => replyToTicket(thread.id, text)}
          onClose={() => closeTicket(thread.id)}
          replyLabel="Send"
          closeLabel="This is sorted"
        />
      ))}
    </div>
  );
}
