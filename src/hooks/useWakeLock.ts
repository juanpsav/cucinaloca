"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

const noop = () => () => {};

/** Keep the screen on while cooking. The browser drops the lock when the tab hides; re-take it. */
export function useWakeLock() {
  const supported = useSyncExternalStore(noop, () => "wakeLock" in navigator, () => false);
  const [wanted, setWanted] = useState(false);
  const [active, setActive] = useState(false);
  const sentinel = useRef<WakeLockSentinel | null>(null);

  const acquire = useCallback(async () => {
    try {
      const lock = await navigator.wakeLock.request("screen");
      sentinel.current = lock;
      setActive(true);
      lock.addEventListener("release", () => setActive(false));
    } catch {
      setActive(false);
    }
  }, []);

  useEffect(() => {
    if (!wanted) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [wanted, acquire]);

  const toggle = () => {
    if (wanted) {
      sentinel.current?.release();
      sentinel.current = null;
    } else {
      acquire(); // inside the tap: some browsers only grant the lock on a user gesture
    }
    setWanted(!wanted);
  };

  return { supported, active: wanted && active, toggle };
}
