import { NextResponse, type NextRequest } from "next/server";

/**
 * cucinaloca.com/https://site.com/recipe  (or /site.com/recipe)  ->  /cook?url=https://site.com/recipe
 * Read from the raw request URL: the path may have had "//" collapsed and the recipe's own
 * query string would otherwise be parsed as ours.
 */
export function proxy(request: NextRequest) {
  let raw = request.url.slice(request.nextUrl.origin.length + 1);
  if (/^https?%3A/i.test(raw)) raw = safeDecode(raw, decodeURIComponent);
  const first = raw.split(/[/?#]/)[0];
  const isUrl = /^https?:$/i.test(first);
  const isDomain = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(first) && !/\.(ico|png|svg|jpe?g|txt|xml|js|css|webmanifest|json)$/i.test(first);
  if (!isUrl && !isDomain) {
    // Trailing-slash redirects are off globally (next.config.ts); keep them for our own pages.
    const { pathname } = request.nextUrl;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      const clean = request.nextUrl.clone();
      clean.pathname = pathname.replace(/\/+$/, "");
      return NextResponse.redirect(clean, 308);
    }
    return NextResponse.next();
  }

  const decoded = safeDecode(raw);
  const target = isUrl ? decoded.replace(/^(https?):\/+/i, "$1://") : `https://${decoded}`;
  const dest = new URL("/cook", request.url);
  dest.searchParams.set("url", target);
  return NextResponse.redirect(dest);
}

function safeDecode(s: string, decode = decodeURI) {
  try {
    return decode(s);
  } catch {
    return s;
  }
}

export const config = {
  matcher: ["/((?!api/|_next/|cook).+)"],
};
