import { NextResponse, type NextRequest } from "next/server";
import { recipeFromPath } from "@/lib/incoming";

/**
 * cucinaloca.com/https://site.com/recipe (or /site.com/recipe, or a link an iOS Shortcut
 * percent-encoded)  ->  /cook?url=https://site.com/recipe
 * Read from the raw request URL: the path may have had "//" collapsed and the recipe's own
 * query string would otherwise be parsed as ours.
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/cook") return NextResponse.next();

  const target = recipeFromPath(request.url.slice(request.nextUrl.origin.length));
  if (!target) {
    // Trailing-slash redirects are off globally (next.config.ts); keep them for our own pages.
    const { pathname } = request.nextUrl;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      const clean = request.nextUrl.clone();
      clean.pathname = pathname.replace(/\/+$/, "");
      return NextResponse.redirect(clean, 308);
    }
    return NextResponse.next();
  }

  const dest = new URL("/cook", request.url);
  dest.searchParams.set("url", target);
  return NextResponse.redirect(dest);
}

export const config = {
  matcher: ["/((?!api/|_next/).+)"],
};
