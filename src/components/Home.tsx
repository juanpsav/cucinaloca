"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { ShareFallback } from "@/components/ShareFallback";
import { ThemeToggle } from "@/components/ThemeToggle";
import { stashImport } from "@/lib/client/session";

export function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);

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
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5">
      <header className="flex items-center justify-between pt-5">
        <Logo href={null} className="text-xl" />
        <ThemeToggle />
      </header>

      <div className="flex flex-1 flex-col justify-center pb-20">
        <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">A chef in your kitchen.</h1>
        <p className="mt-2 text-muted">Paste a recipe, then ask for swaps, more servings or what&apos;s in season.</p>

        <form
          onSubmit={open}
          className="mt-7 flex items-center gap-2 rounded-full border border-line bg-surface p-2 pl-5 shadow-md transition focus-within:border-accent focus-within:shadow-lg"
        >
          <input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            autoFocus
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            placeholder="Paste a recipe link"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-lg outline-none placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={!url.trim()}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-5 py-3 font-medium text-paper transition disabled:opacity-40"
          >
            Cook <ArrowRight className="size-4" />
          </button>
        </form>
        {error && <p className="mt-2 pl-5 text-sm text-accent">{error}</p>}

        <div className="mt-4 pl-5">
          <button onClick={() => setMore((m) => !m)} className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-ink" aria-expanded={more}>
            No link, or the site won&apos;t open?
            <ChevronDown className={`size-4 transition ${more ? "rotate-180" : ""}`} />
          </button>
          {more && (
            <div className="mt-3 space-y-4">
              <ShareFallback onImported={(recipe) => router.push(`/cook?s=${stashImport(recipe)}`)} compact />
              <p className="text-sm text-muted">
                You can also put <code className="rounded bg-surface px-1.5 py-0.5 text-ink ring-1 ring-line">cucinaloca.com/</code> in front of any
                recipe&apos;s address.
              </p>
            </div>
          )}
        </div>
      </div>

      <footer className="flex flex-wrap justify-center gap-x-5 gap-y-1 pb-6 text-xs text-muted/80">
        <Link className="transition hover:text-ink" href="/shortcut">
          iPhone shortcut
        </Link>
        <Link className="transition hover:text-ink" href="/extension">
          Chrome extension
        </Link>
        <a className="transition hover:text-ink" href="https://github.com/juanpsav/cucinaloca">
          GitHub
        </a>
      </footer>
    </main>
  );
}
