import Anthropic from "@anthropic-ai/sdk";
import { runAgent } from "@/lib/chat/agent";
import { ChatRequest, type ChatEvent } from "@/lib/chat/protocol";
import { checkLimit } from "@/lib/ratelimit";

export const maxDuration = 120;

const MAX_BODY = 300_000;

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY) return Response.json({ error: "This conversation is too long." }, { status: 413 });
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    json = null;
  }
  const parsed = ChatRequest.safeParse(json);
  if (!parsed.success || parsed.data.turns.at(-1)?.role !== "user") {
    return Response.json({ error: "Invalid chat request." }, { status: 400 });
  }

  const limited = await checkLimit("chat", request);
  if (limited) return limited;

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: ChatEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        await runAgent(parsed.data, emit, request.signal);
      } catch (e) {
        if (!request.signal.aborted) {
          if (!(e instanceof Anthropic.APIError && e.status === 429)) console.error("chat failed", e);
          emit({ type: "error", message: "Something went wrong. Try again in a moment." });
        }
      }
      emit({ type: "done" });
      controller.close();
    },
  });
  return new Response(body, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
