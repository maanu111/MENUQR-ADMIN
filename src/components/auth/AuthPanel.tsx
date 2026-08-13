"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

type Mode = "signin" | "register";

const PLAN_LABEL: Record<string, string> = {
  starter: "Starter · ₹999/mo",
  growth: "Growth · ₹2,499/mo",
  chain: "Chain · custom pricing",
};

export function AuthPanel({
  initialMode,
  plan,
}: {
  initialMode: Mode;
  plan?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [badField, setBadField] = useState("");

  const isRegister = mode === "register";
  const working = busy || pending;

  function switchTo(next: Mode) {
    setMode(next);
    setError("");
    setNotice("");
    setBadField("");
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBadField("");

    const data = new FormData(e.currentTarget);
    const body = isRegister
      ? {
          outlet: String(data.get("outlet") ?? ""),
          owner: String(data.get("owner") ?? ""),
          email: String(data.get("email") ?? ""),
          phone: String(data.get("phone") ?? ""),
          password: String(data.get("password") ?? ""),
          plan,
        }
      : {
          email: String(data.get("email") ?? ""),
          password: String(data.get("password") ?? ""),
        };

    setBusy(true);
    try {
      const response = await fetch(
        isRegister ? "/api/auth/register" : "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        field?: string;
        message?: string;
        redirect?: string;
      };

      if (!response.ok) {
        setBadField(result.field ?? "");
        setError(result.message ?? "That didn't work. Try again.");
        return;
      }

      setNotice(isRegister ? "Account created. Taking you in…" : "Signed in…");
      startTransition(() => {
        router.push(result.redirect ?? "/dashboard");
        router.refresh();
      });
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* One control switches the form — same route, no reload. */}
      <div
        role="tablist"
        aria-label="Account"
        className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1"
      >
        {(["signin", "register"] as Mode[]).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => switchTo(m)}
            className={`rounded-lg py-2 text-[0.8125rem] font-semibold transition ${
              mode === m
                ? "bg-ground text-ink shadow-[0_1px_2px_rgb(11_18_32/0.1)]"
                : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <h1 className="display mt-7 text-2xl">
        {isRegister ? "Set up your restaurant" : "Welcome back"}
      </h1>
      <p className="mt-1.5 text-[0.8125rem] text-ink-2">
        {isRegister
          ? "Fourteen days free. No card, cancel whenever."
          : "Sign in to your dashboard."}
      </p>

      {isRegister && plan && PLAN_LABEL[plan] ? (
        <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[0.6875rem] font-medium text-brand">
          <span className="size-1.5 rounded-full bg-brand" />
          {PLAN_LABEL[plan]}
        </p>
      ) : null}

      <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-4">
        {isRegister ? (
          <>
            <Field
              id="outlet"
              name="outlet"
              label="Restaurant name"
              placeholder="e.g. Kesar Tandoor"
              autoComplete="organization"
              error={badField === "outlet"}
            />
            <Field
              id="owner"
              name="owner"
              label="Your name"
              placeholder="e.g. Rakesh Malhotra"
              autoComplete="name"
            />
          </>
        ) : null}

        <Field
          id="email"
          name="email"
          type="email"
          label="Email"
          placeholder="e.g. owner@kesartandoor.in"
          autoComplete="email"
          error={badField === "email"}
        />

        {isRegister ? (
          <Field
            id="phone"
            name="phone"
            label="Mobile"
            placeholder="e.g. 98765 43210"
            inputMode="numeric"
            maxLength={10}
            autoComplete="tel"
            error={badField === "phone"}
          />
        ) : null}

        <Field
          id="password"
          name="password"
          type="password"
          label="Password"
          hint={isRegister ? "8 characters minimum" : undefined}
          placeholder="At least 8 characters"
          autoComplete={isRegister ? "new-password" : "current-password"}
          error={badField === "password"}
        />

        {!isRegister ? (
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-[0.75rem] text-ink-2">
              <input
                type="checkbox"
                name="remember"
                className="size-3.5 rounded border-line accent-brand"
              />
              Keep me signed in
            </label>
            <Link
              href="/reset"
              className="text-[0.75rem] font-medium text-brand hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-[0.75rem] text-bad">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="text-[0.75rem] text-good">
            {notice}
          </p>
        ) : null}

        <Button type="submit" disabled={working} className="mt-1 w-full">
          {working
            ? "Just a moment…"
            : isRegister
              ? "Create account"
              : "Sign in"}
        </Button>
      </form>

      <p className="mt-5 text-[0.75rem] leading-relaxed text-ink-3">
        {isRegister ? (
          <>
            By creating an account you agree to our{" "}
            <Link href="/terms" className="text-ink-2 underline underline-offset-2">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-ink-2 underline underline-offset-2">
              privacy policy
            </Link>
            .
          </>
        ) : (
          <>
            New here?{" "}
            <button
              type="button"
              onClick={() => switchTo("register")}
              className="font-medium text-brand hover:underline"
            >
              Create an account
            </button>
          </>
        )}
      </p>
    </div>
  );
}
