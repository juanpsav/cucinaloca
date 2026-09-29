import type { Metadata } from "next";
import { CookClient, EmbedClient } from "@/components/CookClient";

export const metadata: Metadata = { title: "Cooking — Cucina Loca", robots: { index: false } };

export default async function CookPage({ searchParams }: PageProps<"/cook">) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;
  if (one(params.embed) === "1") return <EmbedClient />;
  const url = one(params.url);
  const local = one(params.s);
  // Remount per recipe so navigating between recipes starts a fresh session.
  return <CookClient key={url ?? local ?? ""} url={url} local={local} />;
}
