"use client";

import { Analytics } from "@vercel/analytics/next";

/** Page views only, with query strings dropped: which recipes people cook stays private. */
export function SiteAnalytics() {
  return <Analytics beforeSend={(event) => ({ ...event, url: event.url.split("?")[0] })} />;
}
