"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Tone = "good" | "bad" | "info";
type Toast = { id: number; message: string; tone: Tone };

type Notify = {
  ok: (message: string) => void;
  fail: (message: string) => void;
  info: (message: string) => void;
  /** Runs an action, toasting its result. Returns whether it succeeded. */
  run: <T extends { ok: boolean; message?: string }>(
    action: () => Promise<T>,
    success: string,
  ) => Promise<T | null>;
};

const ToastContext = createContext<Notify | null>(null);

const TONE: Record<Tone, { ring: string; dot: string }> = {
  good: { ring: "border-good/35", dot: "bg-good" },
  bad: { ring: "border-bad/40", dot: "bg-bad" },
  info: { ring: "border-brand/35", dot: "bg-brand" },
};

export function Toaster({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((message: string, tone: Tone) => {
    const id = nextId.current++;
    /* Keep the stack short — three is already a lot to read at once. */
    setToasts((current) => [...current.slice(-2), { id, message, tone }]);
    window.setTimeout(
      () => setToasts((current) => current.filter((t) => t.id !== id)),
      tone === "bad" ? 5200 : 3200,
    );
  }, []);

  const value = useMemo<Notify>(
    () => ({
      ok: (message) => push(message, "good"),
      fail: (message) => push(message, "bad"),
      info: (message) => push(message, "info"),
      run: async (action, success) => {
        try {
          const result = await action();
          if (result.ok) push(success, "good");
          else push(result.message ?? "That didn't work.", "bad");
          return result;
        } catch {
          push("Couldn't reach the server. Try again.", "bad");
          return null;
        }
      },
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 px-4 pb-5"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex max-w-md items-center gap-2.5 rounded-full border bg-ground px-4 py-2.5 text-[0.8125rem] font-medium text-ink shadow-[0_18px_40px_-22px_rgb(11_18_32/0.5)] ${TONE[toast.tone].ring}`}
            style={{ animation: "toast-in 0.22s cubic-bezier(0.16,1,0.3,1) both" }}
          >
            <span
              aria-hidden="true"
              className={`size-1.5 shrink-0 rounded-full ${TONE[toast.tone].dot}`}
            />
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Every mutation in the console goes through this, so nothing ever succeeds
 * or fails silently. Outside a provider it degrades to no-ops rather than
 * throwing — a missing toast must never take a page down.
 */
export function useToast(): Notify {
  const ctx = useContext(ToastContext);
  return (
    ctx ?? {
      ok: () => {},
      fail: () => {},
      info: () => {},
      run: async (action) => {
        try {
          return await action();
        } catch {
          return null;
        }
      },
    }
  );
}
