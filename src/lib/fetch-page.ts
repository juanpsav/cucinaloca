import dns from "node:dns";
import net from "node:net";
import { Agent, fetch } from "undici";

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 5 * 1024 * 1024;
const USER_AGENT = "Mozilla/5.0 (compatible; CucinaLoca/2.0; +https://cucinaloca.com)";

export class FetchPageError extends Error {
  constructor(
    message: string,
    /** "blocked": the site refused us; the user should share the page another way. */
    readonly kind: "invalid" | "blocked" | "failed",
  ) {
    super(message);
  }
}

// Anything that isn't the public internet. Checked at connect time (below), so
// redirects and DNS rebinding can't reach internal hosts either.
const privateRanges = new net.BlockList();
for (const [addr, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["224.0.0.0", 3],
] as const) privateRanges.addSubnet(addr, prefix, "ipv4");
for (const [addr, prefix] of [
  ["::", 127], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8], ["64:ff9b::", 96], ["2001:db8::", 32],
] as const) privateRanges.addSubnet(addr, prefix, "ipv6");

function isPublic(address: string, family: number): boolean {
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return !privateRanges.check(mapped[1], "ipv4");
  return !privateRanges.check(address, family === 6 ? "ipv6" : "ipv4");
}

const safeLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 4);
    const ok = addresses.filter((a) => isPublic(a.address, a.family));
    if (ok.length === 0) {
      return callback(Object.assign(new Error(`Refusing to connect to ${hostname}`), { code: "EPRIVATE" }), "", 4);
    }
    if (options.all) return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, ok);
    callback(null, ok[0].address, ok[0].family);
  });
};

const agent = new Agent({ connect: { lookup: safeLookup } });

export function parseRecipeUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new FetchPageError("That doesn't look like a web address.", "invalid");
  }
  if (!["http:", "https:"].includes(url.protocol) || (url.port && !["80", "443"].includes(url.port))) {
    throw new FetchPageError("Only regular http(s) pages can be opened.", "invalid");
  }
  if (net.isIP(url.hostname.replace(/^\[|\]$/g, ""))) {
    throw new FetchPageError("Open the recipe by its web address, not an IP.", "invalid");
  }
  url.hash = "";
  return url;
}

/** Fetch a recipe page's HTML on behalf of the user, respecting sites that refuse. */
export async function fetchPage(url: URL): Promise<{ html: string; finalUrl: string }> {
  let res;
  try {
    res = await fetch(url, {
      dispatcher: agent,
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml", "accept-language": "en,fr;q=0.8" },
    });
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "TimeoutError";
    throw new FetchPageError(timedOut ? "The site took too long to respond." : "Couldn't reach that site.", "failed");
  }

  if ([401, 402, 403, 429, 451, 503].includes(res.status)) {
    throw new FetchPageError(`${url.hostname} doesn't allow Cucina Loca to read its pages.`, "blocked");
  }
  if (!res.ok) throw new FetchPageError(`The site answered with an error (${res.status}).`, "failed");
  const type = res.headers.get("content-type") ?? "";
  if (!/html|xml/i.test(type)) throw new FetchPageError("That link isn't a web page.", "invalid");

  const reader = res.body!.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      throw new FetchPageError("That page is too large to read.", "failed");
    }
    chunks.push(value);
  }
  const html = Buffer.concat(chunks).toString("utf8");
  // Cloudflare-style interstitials come back as 200 on some sites.
  if (/<title>\s*(Just a moment|Attention Required)/i.test(html)) {
    throw new FetchPageError(`${url.hostname} doesn't allow Cucina Loca to read its pages.`, "blocked");
  }
  return { html, finalUrl: res.url || url.toString() };
}
