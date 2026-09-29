import { z } from "zod";

/**
 * What the Chrome extension reads from the page the cook has open and hands to the app
 * embedded in its side panel (see extension/sidepanel.js).
 */
export const PagePayload = z.object({
  url: z.string().max(2048),
  title: z.string().max(500),
  siteName: z.string().max(200).nullable(),
  jsonLd: z.array(z.string().max(500_000)).max(20),
  text: z.string().max(60_000),
});
export type PagePayload = z.infer<typeof PagePayload>;

/** Messages are only accepted from our parent frame when it is a browser extension. */
export function isTrustedEmbedder(event: MessageEvent): boolean {
  if (event.source !== window.parent || window.parent === window) return false;
  if (event.origin.startsWith("chrome-extension://")) return true;
  return process.env.NODE_ENV === "development" && /^http:\/\/localhost(:\d+)?$/.test(event.origin);
}
