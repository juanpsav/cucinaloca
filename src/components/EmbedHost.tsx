"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { CookSessionLoader, Shell } from "@/components/CookSessionLoader";
import { isTrustedEmbedder, PagePayload } from "@/lib/embed";

/** The app inside the Chrome extension's side panel: cooks whatever page the extension hands over. */
export function EmbedHost() {
  const [page, setPage] = useState<PagePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isTrustedEmbedder(event)) return;
      if (event.data?.type === "cucinaloca:page") {
        const parsed = PagePayload.safeParse(event.data.page);
        if (parsed.success) {
          setError(null);
          setPage(parsed.data);
        }
      } else if (event.data?.type === "cucinaloca:error" && typeof event.data.message === "string") {
        setError(event.data.message.slice(0, 300));
      }
    };
    window.addEventListener("message", onMessage);
    // Tell the side panel we're ready for the current page (no data leaves with this).
    window.parent.postMessage({ type: "cucinaloca:ready" }, "*");
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (error && !page) {
    return (
      <Shell>
        <div className="mt-10 flex gap-3">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-accent" />
          <p>{error}</p>
        </div>
      </Shell>
    );
  }
  if (!page) {
    return (
      <Shell>
        <p className="mt-10 text-muted">Open a recipe page, then click the Cucina Loca icon in the toolbar to cook it here.</p>
      </Shell>
    );
  }
  // One session per page; clicking the icon again on the same page keeps your progress.
  return <CookSessionLoader key={page.url} url={page.url} local={null} page={page} />;
}
