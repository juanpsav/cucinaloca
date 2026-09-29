import { z } from "zod";
import { ClaudeError } from "@/lib/claude";
import { checkLimit } from "@/lib/ratelimit";
import { enrich } from "@/lib/recipe/ai";

export const maxDuration = 60;

// Bounded so the endpoint can't be used as a general-purpose LLM proxy.
const Line = z.object({ text: z.string().max(2000), group: z.string().max(200).nullable() });
const Body = z.object({
  title: z.string().max(300),
  yield: z.string().max(200).nullable(),
  ingredients: z.array(Line).min(1).max(100),
  steps: z.array(Line).min(1).max(80),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid recipe." }, { status: 400 });

  const limited = await checkLimit("enrich", request);
  if (limited) return limited;

  try {
    return Response.json(await enrich(parsed.data));
  } catch (e) {
    if (!(e instanceof ClaudeError)) console.error("enrich failed", e);
    return Response.json({ error: "Couldn't analyze this recipe." }, { status: 502 });
  }
}
