"use client";

import dynamic from "next/dynamic";

/** The cook session lives in sessionStorage, so it renders on the client only. */
export const CookClient = dynamic(() => import("./CookSessionLoader").then((m) => m.CookSessionLoader), {
  ssr: false,
  loading: () => null,
});

/** Inside the Chrome extension's side panel. */
export const EmbedClient = dynamic(() => import("./EmbedHost").then((m) => m.EmbedHost), {
  ssr: false,
  loading: () => null,
});
