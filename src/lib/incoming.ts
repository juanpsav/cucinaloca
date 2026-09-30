/**
 * Recipe links reach us in many shapes: typed as a prefix (cucinaloca.com/https://…), or
 * built by an iOS Shortcut or share sheet that percent-encodes some or all of the address,
 * sometimes twice. These helpers recover the recipe URL from any of them.
 */

const ASSET = /\.(ico|png|svg|jpe?g|txt|xml|js|css|webmanifest|json)$/i;
const DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;

/**
 * From what follows our origin in a request ("https:/site.com/r?x=1", "cook%3Furl%3D…",
 * "https%3A%2F%2Fsite.com%2Fr"), the recipe URL being opened, or null for our own pages.
 */
export function recipeFromPath(afterOrigin: string): string | null {
  let s = afterOrigin.replace(/^\/+/, "");
  // Undo encoding of our own address or of the whole link ("cook%3Furl%3D", "https%3A%2F%2F";
  // "%25…" when it was encoded twice).
  for (let i = 0; i < 3 && /^(cook%(25)*3F|https?%(25)*3A|[^/?#]*%(25)*2F)/i.test(s); i++) s = decode(s, decodeURIComponent);
  if (/^cook\?url=/i.test(s)) return normalizeRecipeUrl(s.slice("cook?url=".length));

  const first = s.split(/[/?#]/)[0];
  const isUrl = /^https?:$/i.test(first);
  const isDomain = DOMAIN.test(first) && !ASSET.test(first);
  if (!isUrl && !isDomain) return null;
  const decoded = decode(s, decodeURI);
  // Proxies and browsers can collapse "https://" to "https:/".
  return isUrl ? decoded.replace(/^(https?):\/+/i, "$1://") : `https://${decoded}`;
}

/** A ?url= value that may still be percent-encoded once or twice. */
export function normalizeRecipeUrl(value: string): string {
  let s = value.trim();
  for (let i = 0; i < 3 && /^https?%(25)*3A/i.test(s); i++) s = decode(s, decodeURIComponent);
  return s.replace(/^(https?):\/+/i, "$1://");
}

function decode(s: string, fn: (s: string) => string) {
  try {
    return fn(s);
  } catch {
    return s;
  }
}
