"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

const KEY = "cucinaloca:theme";
const media = () => window.matchMedia("(prefers-color-scheme: dark)");

function current(): "light" | "dark" {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === "light" || chosen === "dark") return chosen;
  return media().matches ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const mq = media();
  mq.addEventListener("change", onChange);
  window.addEventListener("cucinaloca:theme", onChange);
  return () => {
    mq.removeEventListener("change", onChange);
    window.removeEventListener("cucinaloca:theme", onChange);
  };
}

/** Light/dark switch. Starts from the device setting; an explicit choice is remembered. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, current, () => "light" as const);
  const next = theme === "dark" ? "light" : "dark";

  function toggle() {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    window.dispatchEvent(new Event("cucinaloca:theme"));
  }

  return (
    <button
      onClick={toggle}
      className={`grid size-8 place-items-center rounded-full text-muted transition hover:text-ink ${className}`}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
