"use client";

import { replyAsStaff, resolveTicket } from "@/app/admin/actions";
import { TicketThread, type Thread } from "./TicketThread";

/** The platform's side: every restaurant's conversation in one list. */
export function SupportInbox({ threads }: { threads: Thread[] }) {
  return (
    <div className="flex flex-col gap-5">
      {threads.map((thread) => (
        <TicketThread
          key={thread.id}
          thread={thread}
          fromStaff
          onReply={(body) => replyAsStaff(thread.id, body)}
          onClose={() => resolveTicket(thread.id)}
          replyLabel="Send reply"
          closeLabel="Mark resolved"
        />
      ))}
    </div>
  );
}
