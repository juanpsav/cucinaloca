import { z } from "zod";
import type { Change } from "@/lib/recipe/edit";
import { Recipe } from "@/lib/recipe/types";

export const ChatTurn = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().max(4000),
  /** Summaries of the recipe changes made in an assistant turn. */
  changes: z.array(z.string().max(300)).max(20),
});
export type ChatTurn = z.infer<typeof ChatTurn>;

/** Everything the stateless chat endpoint needs; the browser holds the session. */
export const ChatRequest = z.object({
  recipe: Recipe,
  factor: z.number().positive().max(50),
  turns: z.array(ChatTurn).min(1).max(40),
  preferences: z.array(z.string().max(200)).max(30),
  context: z.object({
    date: z.string().max(40),
    region: z.string().max(80).nullable(),
  }),
});
export type ChatRequest = z.infer<typeof ChatRequest>;

/** Newline-delimited JSON events streamed back while the agent works. */
export type ChatEvent =
  | { type: "text"; text: string }
  | { type: "status"; text: string }
  | { type: "change"; change: Change; factor: number }
  | { type: "servings"; factor: number }
  | { type: "preference"; text: string }
  | { type: "error"; message: string }
  | { type: "done" };
