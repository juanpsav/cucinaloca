"use client";

import { ClipboardPaste, ImagePlus, LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";
import { prepareImages } from "@/lib/client/images";
import type { ImportedRecipe } from "@/lib/recipe/types";

/** Import from what the user can see: screenshots/photos, or copied page text. */
export function ShareFallback({
  url,
  onImported,
  compact = false,
}: {
  url?: string | null;
  onImported: (recipe: ImportedRecipe) => void;
  compact?: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pasting, setPasting] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<null | "images" | "text">(null);
  const [error, setError] = useState<string | null>(null);

  async function send(body: object, kind: "images" | "text") {
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url ?? null, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed.");
      onImported(data as ImportedRecipe);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(null);
    }
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = [...files].slice(0, 6);
    setBusy("images");
    try {
      await send({ images: await prepareImages(list) }, "images");
    } catch {
      setError("Couldn't read those images.");
      setBusy(null);
    }
  }

  const button =
    "inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-medium transition hover:border-ink/30 disabled:opacity-50";

  return (
    <div className="space-y-3">
      <div className={`flex flex-wrap gap-2 ${compact ? "" : "justify-center"}`}>
        <button className={button} disabled={!!busy} onClick={() => fileInput.current?.click()}>
          {busy === "images" ? <LoaderCircle className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          {busy === "images" ? "Reading screenshots…" : "Add screenshots"}
        </button>
        <button className={button} disabled={!!busy} onClick={() => setPasting((p) => !p)}>
          <ClipboardPaste className="size-4" />
          Paste the text
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {pasting && (
        <div className="space-y-2">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Select all on the recipe page, copy, and paste it here."
            className="h-36 w-full resize-y rounded-2xl border border-line bg-surface p-3 text-sm outline-none focus:border-accent"
          />
          <button
            className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-40"
            disabled={text.trim().length < 50 || !!busy}
            onClick={() => send({ text: text.slice(0, 60_000) }, "text")}
          >
            {busy === "text" && <LoaderCircle className="size-4 animate-spin" />}
            {busy === "text" ? "Reading…" : "Use this text"}
          </button>
        </div>
      )}
      {error && <p className="text-sm text-accent">{error}</p>}
    </div>
  );
}
