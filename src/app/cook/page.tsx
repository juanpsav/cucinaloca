import type { Metadata } from "next";
import { CookClient, EmbedClient } from "@/components/CookClient";
import { normalizeRecipeUrl } from "@/lib/incoming";

export const metadata: Metadata = { title: "Cucina Loca", robots: { index: false } };

export default async function CookPage({ searchParams }: PageProps<"/cook">) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;
  if (one(params.embed) === "1") return <EmbedClient />;
  const raw = one(params.url);
  const url = raw ? normalizeRecipeUrl(raw) : null;
  const local = one(params.s);
  // Remount per recipe so navigating between recipes starts a fresh session.
  return <CookClient key={url ?? local ?? ""} url={url} local={local} />;
}
