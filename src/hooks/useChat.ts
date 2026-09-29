"use client";

import { useCallback, useRef, useState } from "react";
import type { ChatEvent, ChatRequest } from "@/lib/chat/protocol";
import { addPreference, getPreferences } from "@/lib/client/preferences";
import type { ChatMessage, CookSession } from "@/lib/client/session";
import { applyChange } from "@/lib/recipe/edit";
import { formatAmount } from "@/lib/recipe/scale";

export type SessionUpdater = (fn: (s: CookSession) => CookSession) => void;

const MAX_TURNS = 20;

export function useChat(session: CookSession, update: SessionUpdater) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const latest = useRef(session);
  latest.current = session;

  const send = useCallback(
    async (text: string) => {
      const s = latest.current;
      const user: ChatMessage = { id: crypto.randomUUID(), role: "user", text, changes: [], remembered: [] };
      const replyId = crypto.randomUUID();
      const patchReply = (fn: (m: ChatMessage) => ChatMessage) =>
        update((s) => ({ ...s, chat: s.chat.map((m) => (m.id === replyId ? fn(m) : m)) }));

      let turns = [...s.chat, user].map((m) => ({
        role: m.role,
        text: m.text.slice(0, 4000),
        changes: m.changes.filter((c) => !c.undone).map((c) => c.summary),
      }));
      turns = turns.slice(-MAX_TURNS);
      if (turns[0].role === "assistant") turns = turns.slice(1);

      update((s) => ({
        ...s,
        chat: [...s.chat, user, { id: replyId, role: "assistant", text: "", changes: [], remembered: [], before: { recipe: s.recipe, factor: s.factor } }],
      }));
      setBusy(true);

      const body: ChatRequest = {
        recipe: s.recipe,
        factor: s.factor,
        turns,
        preferences: getPreferences(),
        context: {
          date: new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
          // The time zone says hemisphere and region (for what's in season) without asking for location.
          region: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
        },
      };

      try {
        const res = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}));
          patchReply((m) => ({ ...m, error: data.error ?? "Something went wrong." }));
          return;
        }
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += value;
          const lines = buffer.split("\n");
          buffer = lines.pop()!;
          for (const line of lines) if (line.trim()) handle(JSON.parse(line) as ChatEvent);
        }
      } catch {
        patchReply((m) => ({ ...m, error: "Lost the connection. Try again." }));
      } finally {
        setBusy(false);
        setStatus(null);
      }

      function withChange(chat: ChatMessage[], summary: string) {
        return chat.map((m) => (m.id === replyId ? { ...m, changes: [...m.changes, { id: crypto.randomUUID(), summary, undone: false }] } : m));
      }

      function handle(e: ChatEvent) {
        switch (e.type) {
          case "text":
            setStatus(null);
            patchReply((m) => ({ ...m, text: m.text + e.text }));
            break;
          case "status":
            setStatus(e.text);
            break;
          case "change":
            update((s) => {
              const result = applyChange(s.recipe, e.change, e.factor);
              if (!result.ok) return s;
              return { ...s, recipe: result.recipe, chat: withChange(s.chat, e.change.summary) };
            });
            break;
          case "servings":
            update((s) => {
              const amount = s.recipe.servings.amount;
              const summary = amount ? `Scaled to ${formatAmount(amount * e.factor)} ${s.recipe.servings.label}` : `Scaled ×${formatAmount(e.factor)}`;
              return { ...s, factor: e.factor, chat: withChange(s.chat, summary) };
            });
            break;
          case "preference":
            addPreference(e.text);
            patchReply((m) => ({ ...m, remembered: [...m.remembered, e.text] }));
            break;
          case "error":
            patchReply((m) => ({ ...m, error: e.message }));
            break;
        }
      }
    },
    [update],
  );

  /** Revert everything one reply changed (edits and rescaling). */
  const undo = useCallback(
    (messageId: string) =>
      update((s) => {
        const message = s.chat.find((m) => m.id === messageId);
        if (!message?.before) return s;
        return {
          ...s,
          recipe: message.before.recipe,
          factor: message.before.factor,
          chat: s.chat.map((m) => (m.id === messageId ? { ...m, changes: m.changes.map((c) => ({ ...c, undone: true })) } : m)),
        };
      }),
    [update],
  );

  return { send, undo, busy, status };
}
