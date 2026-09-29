import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/** Per-IP limits on the routes that spend API tokens. Generous for cooking, tight for scripts. */
const LIMITS = {
  import: { requests: 20, windowSeconds: 3600 },
  enrich: { requests: 20, windowSeconds: 3600 },
  chat: { requests: 60, windowSeconds: 3600 },
  export: { requests: 30, windowSeconds: 3600 },
} as const;
export type LimitName = keyof typeof LIMITS;

type Limiter = { limit(key: string): Promise<{ success: boolean; reset: number }> };

const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

/** Without Redis (local dev) limits are per process, which is all one dev server needs. */
function memoryLimiter(requests: number, windowSeconds: number): Limiter {
  const hits = new Map<string, number[]>();
  return {
    async limit(key) {
      const now = Date.now();
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowSeconds * 1000);
      const success = recent.length < requests;
      if (success) recent.push(now);
      hits.set(key, recent);
      return { success, reset: (recent[0] ?? now) + windowSeconds * 1000 };
    },
  };
}

const limiters = Object.fromEntries(
  Object.entries(LIMITS).map(([name, { requests, windowSeconds }]) => [
    name,
    redis
      ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`), prefix: `cl:${name}` })
      : memoryLimiter(requests, windowSeconds),
  ]),
) as Record<LimitName, Limiter>;

export async function checkLimit(name: LimitName, request: Request): Promise<Response | null> {
  const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  const { success, reset } = await limiters[name].limit(ip);
  if (success) return null;
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return Response.json(
    { error: "That's a lot of recipes for one hour. Try again a little later." },
    { status: 429, headers: { "retry-after": String(retryAfter) } },
  );
}
