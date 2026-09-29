"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { ShareFallback } from "@/components/ShareFallback";
import { stashImport } from "@/lib/client/session";

export function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function open(e: React.FormEvent) {
    e.preventDefault();
    let target = url.trim();
    if (!/^https?:\/\//i.test(target)) target = `https://${target}`;
    try {
      new URL(target);
    } catch {
      setError("Paste the full link to a recipe page.");
      return;
    }
    router.push(`/cook?url=${encodeURIComponent(target)}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5">
      <div className="flex flex-1 flex-col justify-center py-16">
        <Logo href={null} />
        <h1 className="mt-6 font-serif text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-6xl">
          Cook any recipe, your way.
        </h1>
        <p className="mt-5 max-w-lg text-lg text-muted">
          Open a recipe in a clean cook view: scale it, time it, and follow along step by step. Nothing is saved: close the tab and it&apos;s gone.
        </p>

        <form onSubmit={open} className="mt-10 flex items-center gap-2 rounded-full border border-line bg-surface p-1.5 pl-5 shadow-sm focus-within:border-accent">
          <input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            placeholder="Paste a recipe link"
            className="min-w-0 flex-1 bg-transparent py-2 outline-none placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={!url.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-medium text-paper transition disabled:opacity-40"
          >
            Cook <ArrowRight className="size-4" />
          </button>
        </form>
        {error && <p className="mt-2 pl-5 text-sm text-accent">{error}</p>}

        <div className="mt-8">
          <p className="mb-3 text-sm text-muted">No link, or the site won&apos;t open? Use what&apos;s on your screen:</p>
          <ShareFallback onImported={(recipe) => router.push(`/cook?s=${stashImport(recipe)}`)} compact />
        </div>
      </div>

      <footer className="border-t border-line py-6 text-sm text-muted">
        <p>
          <span className="font-medium text-ink">Tip:</span> put <code className="rounded bg-surface px-1.5 py-0.5 text-ink">cucinaloca.com/</code> in front of
          any recipe&apos;s address.
        </p>
        <p className="mt-2">
          <a className="underline decoration-line underline-offset-4 hover:text-ink" href="https://github.com/juanpsav/cucinaloca">
            Source on GitHub
          </a>
        </p>
      </footer>
    </main>
  );
}
