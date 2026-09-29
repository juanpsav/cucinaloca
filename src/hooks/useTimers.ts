"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RunningTimer = { id: string; label: string; seconds: number; endsAt: number };

/** Kitchen timers. Times are wall-clock so they stay right if the tab was throttled. */
export function useTimers() {
  const [timers, setTimers] = useState<RunningTimer[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const audio = useRef<AudioContext | null>(null);
  const timersRef = useRef(timers);
  const lastChime = useRef(0);

  useEffect(() => {
    timersRef.current = timers;
  }, [timers]);

  const start = useCallback((label: string, seconds: number) => {
    // Created inside the tap so iOS allows it to play later.
    audio.current ??= new AudioContext();
    audio.current.resume();
    const startedAt = Date.now();
    setNow(startedAt);
    setTimers((t) => [...t, { id: crypto.randomUUID(), label, seconds, endsAt: startedAt + seconds * 1000 }]);
  }, []);

  const dismiss = useCallback((id: string) => setTimers((t) => t.filter((x) => x.id !== id)), []);

  useEffect(() => {
    if (timers.length === 0) return;
    const tick = setInterval(() => {
      const t = Date.now();
      setNow(t);
      // Ring when a timer finishes, then every few seconds until it's dismissed.
      if (timersRef.current.some((x) => x.endsAt <= t) && t - lastChime.current > 4000) {
        lastChime.current = t;
        if (audio.current) chime(audio.current);
        navigator.vibrate?.([300, 150, 300]);
      }
    }, 250);
    return () => clearInterval(tick);
  }, [timers.length]);

  return { timers, now, start, dismiss };
}

function chime(ctx: AudioContext) {
  [0, 0.22, 0.44].forEach((offset, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = [880, 1175, 1568][i];
    const t = ctx.currentTime + offset;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.55);
  });
}

export function formatClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}
