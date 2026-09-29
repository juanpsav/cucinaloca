"use client";

import { LoaderCircle, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CookView, type EnrichState } from "@/components/CookView";
import { Logo } from "@/components/Logo";
import { ShareFallback } from "@/components/ShareFallback";
import type { PagePayload } from "@/lib/embed";
import { loadSession, saveSession, takeStashedImport, type CookSession } from "@/lib/client/session";
import { applyEnrichment, fromImported } from "@/lib/recipe/build";
import type { Enrichment, ImportedRecipe } from "@/lib/recipe/types";

type State =
  | { status: "loading" }
  | { status: "error"; error: string; kind: string }
  | { status: "ready"; session: CookSession; enrich: EnrichState };

const started = (source: ImportedRecipe): State => ({
  status: "ready",
  session: { source, recipe: fromImported(source), base: null, factor: 1, checked: [], current: null, chat: [], earlierChanges: [] },
  enrich: "running",
});

/** Client-only (reads sessionStorage on first render); see CookClient. */
export function CookSessionLoader({ url, local, page }: { url: string | null; local: string | null; page?: PagePayload }) {
  const id = url ?? local ?? "";
  const [state, setState] = useState<State>(() => {
    const saved = loadSession(id);
    if (saved) return { status: "ready", session: saved, enrich: saved.recipe.enriched ? "done" : "running" };
    if (local) {
      const stashed = takeStashedImport(local);
      return stashed ? started(stashed) : { status: "error", error: "This cooking session has ended.", kind: "gone" };
    }
    if (!url) return { status: "error", error: "No recipe to open.", kind: "invalid" };
    return { status: "loading" };
  });

  // Import from the link.
  const importing = useRef(false);
  useEffect(() => {
    if (state.status !== "loading" || !url || importing.current) return;
    importing.current = true;
    // From the extension we already have the page as the cook's browser loaded it.
    const body = page ? { url, page: { title: page.title, siteName: page.siteName, jsonLd: page.jsonLd, text: page.text } } : { url };
    fetch("/api/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      .then(async (res) => {
        const data = await res.json();
        setState(res.ok ? started(data) : { status: "error", error: data.error ?? "Couldn't open that recipe.", kind: data.kind ?? "failed" });
      })
      .catch(() => setState({ status: "error", error: "Couldn't reach Cucina Loca. Check your connection.", kind: "failed" }));
  }, [state.status, url, page]);

  // Have Claude read the recipe (scaling, step ingredients, timers) while the cook starts reading.
  const source = state.status === "ready" && state.enrich === "running" ? state.session.source : null;
  const enriching = useRef<ImportedRecipe | null>(null);
  useEffect(() => {
    if (!source || enriching.current === source) return;
    enriching.current = source;
    const body = { title: source.title, yield: source.yield, ingredients: source.ingredients, steps: source.steps };
    fetch("/api/enrich", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
      .then(async (res) => (res.ok ? ((await res.json()) as Enrichment) : null))
      .catch(() => null)
      .then((enrichment) =>
        setState((s) => {
          if (s.status !== "ready" || s.session.source !== source) return s;
          // Keep what the cook did meanwhile (checked items, current step, scale).
          const recipe = enrichment && applyEnrichment(s.session.recipe, enrichment);
          // What the recipe looked like before any chat edits: the reference for diffs and "back to the original".
          return recipe
            ? { ...s, session: { ...s.session, recipe, base: recipe }, enrich: "done" }
            : { ...s, session: { ...s.session, base: s.session.recipe }, enrich: "failed" };
        }),
      );
  }, [source]);

  useEffect(() => {
    if (state.status === "ready") saveSession(id, state.session);
  }, [id, state]);

  if (state.status === "ready") {
    return (
      <CookView
        session={state.session}
        update={(fn) => setState((s) => (s.status === "ready" ? { ...s, session: fn(s.session) } : s))}
        enrichState={state.enrich}
      />
    );
  }

  const host = url ? safeHost(url) : null;
  return (
    <Shell>
      {state.status === "loading" ? (
        <Opening host={host} />
      ) : (
        <div className="mt-10 space-y-6">
          <div className="flex gap-3">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-accent" />
            <div>
              <p className="font-medium">{state.error}</p>
              {(state.kind === "blocked" || state.kind === "not-a-recipe" || state.kind === "failed") && (
                <p className="mt-1 text-muted">
                  You can still cook it here. Take screenshots of the recipe{host ? ` on ${host}` : ""} or copy its text, and add them below.
                </p>
              )}
            </div>
          </div>
          {state.kind === "invalid" || state.kind === "gone" ? (
            <Link href="/" className="inline-block rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper">
              Open another recipe
            </Link>
          ) : (
            <ShareFallback url={url} onImported={(recipe) => setState(started(recipe))} compact />
          )}
        </div>
      )}
    </Shell>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5 py-16">
      <Logo />
      {children}
    </main>
  );
}

export function Opening({ host }: { host: string | null }) {
  return (
    <div className="mt-10 flex items-center gap-3 text-muted">
      <LoaderCircle className="size-5 animate-spin text-accent" />
      Opening the recipe{host ? ` from ${host}` : ""}…
    </div>
  );
}

function safeHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
