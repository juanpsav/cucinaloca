"use client";

import { BookmarkPlus, Check, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { appliedChanges, type CookSession } from "@/lib/client/session";
import { melaFilename } from "@/lib/export/mela";

/**
 * Hand the cook's version to Mela: the share sheet on phones (Mela is a target for
 * .melarecipe files), a download on computers (opening the file imports it).
 */
export function SaveToMela({ session }: { session: CookSession }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function save() {
    setState("busy");
    try {
      const changes = appliedChanges(session);
      const res = await fetch("/api/export/mela", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recipe: session.recipe, factor: session.factor, changes }),
      });
      if (!res.ok) throw new Error();
      const json = await res.text();
      const title = (JSON.parse(json) as { title: string }).title;
      const file = new File([json], melaFilename(title), { type: "application/json" });

      const touch = window.matchMedia("(pointer: coarse)").matches;
      if (touch && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title });
          setState("done");
          return;
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") {
            setState("idle");
            return;
          }
          // Share refused the file: fall through to a download.
        }
      }
      const url = URL.createObjectURL(file);
      const a = Object.assign(document.createElement("a"), { href: url, download: file.name });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <button
      onClick={save}
      disabled={state === "busy"}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted transition hover:text-ink disabled:opacity-60"
      title="Save this version to Mela"
    >
      {state === "busy" ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : state === "done" ? (
        <Check className="size-4 text-accent" />
      ) : (
        <BookmarkPlus className="size-4" />
      )}
      <span className="hidden sm:inline">{state === "error" ? "Couldn't save, try again" : state === "done" ? "Saved" : "Save to Mela"}</span>
    </button>
  );
}
