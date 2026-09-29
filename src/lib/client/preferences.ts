"use client";

import { useSyncExternalStore } from "react";

/**
 * Lasting kitchen preferences ("vegetarian", "no stand mixer"). The only thing that outlives
 * a cook session, and it stays in this browser's localStorage.
 */
const KEY = "cucinaloca:preferences";
const listeners = new Set<() => void>();
const EMPTY: string[] = [];
let cache: { raw: string | null; value: string[] } = { raw: null, value: EMPTY };

function read(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (raw !== cache.raw) {
    let value = EMPTY;
    try {
      value = raw ? (JSON.parse(raw) as string[]) : EMPTY;
    } catch {}
    cache = { raw, value };
  }
  return cache.value;
}

function write(value: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {}
  listeners.forEach((l) => l());
}

export function getPreferences() {
  return read();
}

export function addPreference(text: string) {
  const prefs = read();
  if (!prefs.some((p) => p.toLowerCase() === text.toLowerCase())) write([...prefs, text].slice(-30));
}

export function removePreference(text: string) {
  write(read().filter((p) => p !== text));
}

export function usePreferences() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      window.addEventListener("storage", l);
      return () => {
        listeners.delete(l);
        window.removeEventListener("storage", l);
      };
    },
    read,
    () => EMPTY,
  );
}
