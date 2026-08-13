"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LiveEvent } from "@/lib/live-events";



/** A short two-tone chime, synthesised so there's no audio file to ship. */
function chime(urgent = false) {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = urgent ? [880, 1320] : [660, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const at = ctx.currentTime + i * 0.16;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.16, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.24);
    });
    window.setTimeout(() => void ctx.close(), 900);
  } catch {
    /* Autoplay policy or no audio device — the banner still shows. */
  }
}

/**
 * Holds the live connection for whichever console page mounts it. New tickets
 * and table calls arrive for every member of staff at once, because they are
 * all subscribed to the same restaurant's stream.
 */
export function LiveUpdates({
  sound = true,
  source: path = "/api/stream",
}: {
  sound?: boolean;
  /** "/api/stream" for a restaurant, "/api/admin-stream" for the platform. */
  source?: string;
}) {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const refreshAt = useRef(0);

  useEffect(() => {
    const source = new EventSource(path);

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);

    source.onmessage = (message) => {
      let event: LiveEvent;
      try {
        event = JSON.parse(message.data) as LiveEvent;
      } catch {
        return;
      }
      if (event.type === "ping") return;

      if (event.type === "order.new") {
        setToast(
          event.channel === "DELIVERY"
            ? `New delivery order ${event.code}`
            : event.table
              ? `New order ${event.code} · table ${event.table}`
              : `New order ${event.code}`,
        );
        if (sound) chime();
      } else if (event.type === "call.new") {
        setToast(`Table ${event.table} needs ${event.reason}`);
        if (sound) chime(true);
      } else if (event.type === "ticket.new") {
        setToast(
          event.restaurant
            ? `${event.restaurant} asked for help — ${event.subject}`
            : `New support question — ${event.subject}`,
        );
        if (sound) chime(true);
      } else if (event.type === "ticket.reply") {
        setToast(
          event.fromStaff
            ? `Support replied — ${event.subject}`
            : `${event.restaurant ?? "A restaurant"} replied — ${event.subject}`,
        );
        if (sound) chime();
      }

      /* Coalesce bursts: ten tickets at once should cost one re-render. */
      const now = Date.now();
      if (now - refreshAt.current > 600) {
        refreshAt.current = now;
        router.refresh();
      }
    };

    return () => source.close();
  }, [router, sound, path]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <>
      <span
        className="inline-flex items-center gap-1.5 text-[0.6875rem] text-ink-3"
        title={connected ? "Live — updates arrive on their own" : "Reconnecting…"}
      >
        <span
          className={`size-1.5 rounded-full ${
            connected ? "animate-pulse bg-good" : "bg-warn"
          }`}
        />
        {connected ? "Live" : "Reconnecting"}
      </span>

      {toast ? (
        <div
          role="status"
          aria-live="assertive"
          className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-brand/30 bg-ground px-5 py-3 text-[0.8125rem] font-semibold text-ink shadow-[0_18px_40px_-22px_rgb(11_18_32/0.5)]"
        >
          {toast}
        </div>
      ) : null}
    </>
  );
}
