"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/Toaster";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.ok("Signed out");
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className={
        compact
          ? "shrink-0 rounded-lg px-2.5 py-1.5 text-[0.75rem] font-medium text-ink-2 transition hover:bg-surface-2 disabled:opacity-50"
          : "w-full rounded-lg border border-line px-3 py-2 text-[0.8125rem] font-medium text-ink-2 transition hover:bg-surface-2 hover:text-ink disabled:opacity-50"
      }
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
