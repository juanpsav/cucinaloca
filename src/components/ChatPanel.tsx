"use client";

import { ArrowUp, Bookmark, Check, LoaderCircle, RotateCcw, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useChat, type SessionUpdater } from "@/hooks/useChat";
import { removePreference, usePreferences } from "@/lib/client/preferences";
import type { CookSession } from "@/lib/client/session";

const SUGGESTIONS: { label: string; text: string; send: boolean }[] = [
  { label: "I don't have…", text: "I don't have ", send: false },
  { label: "Make it vegetarian", text: "Make it vegetarian", send: true },
  { label: "Halve it", text: "Halve the recipe", send: true },
  { label: "What can I prep ahead?", text: "What can I prep ahead?", send: true },
];

export function ChatPanel({
  session,
  update,
  open,
  onClose,
  disabled,
}: {
  session: CookSession;
  update: SessionUpdater;
  open: boolean;
  onClose: () => void;
  disabled: boolean;
}) {
  const { send, undo, busy, status } = useChat(session, update);
  const preferences = usePreferences();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Only the latest reply that changed something can be undone, so later edits never get silently dropped.
  const undoable = session.chat.findLast((m) => m.changes.length > 0);
  const canUndo = !!undoable && undoable.changes.some((c) => !c.undone) && !busy;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [session.chat, status]);

  useEffect(() => {
    if (open && window.matchMedia("(min-width: 1024px)").matches) inputRef.current?.focus();
  }, [open]);

  function submit(text = input) {
    const t = text.trim();
    if (!t || busy || disabled) return;
    setInput("");
    send(t);
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-ink/20 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed z-50 flex flex-col border-line bg-paper shadow-2xl transition-transform duration-300 ease-out
          inset-x-0 bottom-0 h-[82dvh] rounded-t-3xl border-t
          lg:inset-y-0 lg:right-0 lg:left-auto lg:h-dvh lg:w-[400px] lg:rounded-none lg:border-t-0 lg:border-l lg:shadow-none
          ${open ? "translate-y-0 lg:translate-x-0" : "translate-y-full lg:translate-y-0 lg:translate-x-full"}`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="flex items-center gap-2 font-medium">
            <Sparkles className="size-4 text-accent" />
            Change or ask anything
          </div>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-full text-muted hover:bg-surface hover:text-ink" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>

        {preferences.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 px-5 pb-3 text-xs">
            <Bookmark className="size-3.5 text-muted" />
            {preferences.map((p) => (
              <span key={p} className="inline-flex items-center gap-1 rounded-full bg-surface py-0.5 pr-1 pl-2.5 ring-1 ring-line">
                {p}
                <button onClick={() => removePreference(p)} className="grid size-4 place-items-center rounded-full text-muted hover:text-ink" aria-label={`Forget ${p}`}>
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex-1 space-y-4 overflow-y-auto border-t border-line px-5 py-4">
          {session.chat.length === 0 && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted">
                Tell me what you have, what you don&apos;t, who you&apos;re cooking for, or what went wrong. I&apos;ll change the recipe for you.
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    disabled={disabled}
                    onClick={() => {
                      if (s.send) submit(s.text);
                      else {
                        setInput(s.text);
                        inputRef.current?.focus();
                      }
                    }}
                    className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm transition hover:border-ink/30 disabled:opacity-50"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {session.chat.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2 text-sm whitespace-pre-line text-paper">{m.text}</p>
              </div>
            ) : (
              <div key={m.id} className="space-y-2 text-sm">
                {m.changes.map((c, i) => (
                  <div
                    key={c.id}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${c.undone ? "border-line text-muted" : "border-accent/30 bg-accent-soft/60"}`}
                  >
                    {c.undone ? <RotateCcw className="size-4 shrink-0" /> : <Check className="size-4 shrink-0 text-accent" />}
                    <span className={`flex-1 ${c.undone ? "line-through" : "font-medium"}`}>{c.summary}</span>
                    {canUndo && m.id === undoable.id && i === m.changes.length - 1 && (
                      <button onClick={() => undo(m.id)} className="rounded-full px-2 py-0.5 text-xs font-medium text-accent hover:bg-paper">
                        Undo
                      </button>
                    )}
                  </div>
                ))}
                {m.text && <p className="leading-relaxed whitespace-pre-line">{m.text}</p>}
                {m.remembered.map((r) => (
                  <p key={r} className="inline-flex items-center gap-1.5 text-xs text-muted">
                    <Bookmark className="size-3.5" /> Remembered: {r}
                  </p>
                ))}
                {m.error && <p className="text-accent">{m.error}</p>}
              </div>
            ),
          )}

          {status && (
            <p className="flex items-center gap-2 text-sm text-muted">
              <LoaderCircle className="size-4 animate-spin text-accent" />
              {status}
            </p>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <div className="flex items-end gap-2 rounded-3xl border border-line bg-surface p-1.5 pl-4 focus-within:border-accent">
            <textarea
              ref={inputRef}
              value={input}
              rows={1}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={disabled ? "Reading the recipe first…" : "No shallots, I have a leek…"}
              disabled={disabled}
              className="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-2 text-[16px] outline-none placeholder:text-muted [field-sizing:content]"
            />
            <button
              type="submit"
              disabled={!input.trim() || busy || disabled}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-paper transition disabled:opacity-30"
              aria-label="Send"
            >
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
