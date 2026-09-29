import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaContentBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { z } from "zod";

export const anthropic = new Anthropic();
export const MODEL = "claude-opus-5-5";

export class ClaudeError extends Error {}

/**
 * One structured-output call. Refusals fall back server-side to Anthropic's recommended
 * model (`fallbacks: "default"`) rather than failing the user's cook session.
 */
export async function structured<S extends z.ZodType>(opts: {
  schema: S;
  system: string;
  content: BetaContentBlockParam[];
  effort?: "low" | "medium" | "high";
}): Promise<z.infer<S>> {
  const res = await anthropic.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: opts.effort ?? "low", format: betaZodOutputFormat(opts.schema) },
    system: opts.system,
    messages: [{ role: "user", content: opts.content }],
  });
  if (res.stop_reason === "refusal") throw new ClaudeError("The model declined this request.");
  if (res.stop_reason === "max_tokens") throw new ClaudeError("The recipe was too long to process.");
  if (res.parsed_output == null) throw new ClaudeError("The model returned an unreadable answer.");
  return res.parsed_output as z.infer<S>;
}
