"use client";

import { useSyncExternalStore } from "react";

type Choice = "light" | "dark" | "system";

const KEY = "tablet-theme";
const EVENT = "tablet-theme-change";

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

function readChoice(): Choice {
  try {
    const stored = window.localStorage.getItem(KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* Storage blocked — follow the OS. */
  }
  return "system";
}

const serverChoice = (): Choice => "system";

const OPTIONS: { id: Choice; label: string; icon: React.ReactNode }[] = [
  {
    id: "light",
    label: "Light",
    icon: (
      <svg viewBox="0 0 20 20" className="size-3.5" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="3.4" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M10 2.4v1.7M10 15.9v1.7M17.6 10h-1.7M4.1 10H2.4m12.1-5.4-1.2 1.2M6.6 13.4l-1.2 1.2m9.1 0-1.2-1.2M6.6 6.6 5.4 5.4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "system",
    label: "System",
    icon: (
      <svg viewBox="0 0 20 20" className="size-3.5" fill="none" aria-hidden="true">
        <rect x="2.6" y="3.6" width="14.8" height="10" rx="1.6" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 16.6h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "dark",
    label: "Dark",
    icon: (
      <svg viewBox="0 0 20 20" className="size-3.5" fill="none" aria-hidden="true">
        <path
          d="M16.3 12.2A6.8 6.8 0 0 1 7.8 3.7a6.8 6.8 0 1 0 8.5 8.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

/**
 * Three-way switch. "System" removes the attribute so the media query takes
 * over again — a two-way toggle can never get back to following the OS.
 */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const choice = useSyncExternalStore(subscribe, readChoice, serverChoice);

  function apply(next: Choice) {
    const root = document.documentElement;

    /* Animate only for the length of the switch, then get out of the way. */
    root.classList.add("theme-switching");
    window.setTimeout(() => root.classList.remove("theme-switching"), 260);

    if (next === "system") {
      root.removeAttribute("data-theme");
      try {
        window.localStorage.removeItem(KEY);
      } catch {
        /* Preference simply won't persist. */
      }
    } else {
      root.setAttribute("data-theme", next);
      try {
        window.localStorage.setItem(KEY, next);
      } catch {
        /* Same. */
      }
    }

    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={`flex gap-0.5 rounded-lg bg-surface-2 p-0.5 ${compact ? "" : "w-full"}`}
    >
      {OPTIONS.map((option) => {
        const active = choice === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.label}
            onClick={() => apply(option.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[0.6875rem] font-semibold transition ${
              active
                ? "bg-ground text-ink shadow-[0_1px_2px_rgb(11_18_32/0.1)]"
                : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {option.icon}
            {!compact ? <span className="hidden sm:inline">{option.label}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
