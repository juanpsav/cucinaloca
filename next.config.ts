import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cucinaloca.com/<recipe-url> must reach src/proxy.ts untouched: a recipe URL's
  // trailing slash and "//" are significant. The proxy does the usual cleanup for our own pages.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
