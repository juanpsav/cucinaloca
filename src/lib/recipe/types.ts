import { z } from "zod";

/**
 * A recipe as found on the source page: plain strings, nothing interpreted.
 * Produced by JSON-LD extraction, or by Claude from page text / a screenshot.
 */
export const SourceRecipe = z.object({
  title: z.string(),
  description: z.string().nullable(),
  yield: z.string().nullable().describe('Servings or yield as written, e.g. "4 servings" or "24 cookies"'),
  prepMinutes: z.number().nullable(),
  cookMinutes: z.number().nullable(),
  totalMinutes: z.number().nullable(),
  ingredients: z.array(
    z.object({
      text: z.string().describe("The full ingredient line, verbatim"),
      group: z.string().nullable().describe('Section heading if the recipe groups ingredients, e.g. "For the sauce"'),
    }),
  ),
  steps: z.array(
    z.object({
      text: z.string().describe("One instruction step, verbatim"),
      group: z.string().nullable().describe("Section heading if the recipe groups steps"),
    }),
  ),
});
export type SourceRecipe = z.infer<typeof SourceRecipe>;

export const RecipeMeta = z.object({
  url: z.string().nullable(),
  siteName: z.string().nullable(),
  author: z.string().nullable(),
  image: z.string().nullable(),
});
export type RecipeMeta = z.infer<typeof RecipeMeta>;

export type ImageInput = { mediaType: "image/jpeg" | "image/png" | "image/webp"; data: string };

/** What the import endpoint returns: renderable immediately, before enrichment. */
export type ImportedRecipe = SourceRecipe & { meta: RecipeMeta; via: "jsonld" | "page-text" | "image" };

export const Timer = z.object({
  label: z.string().describe('Short verb phrase, e.g. "Simmer sauce"'),
  seconds: z.number().describe("Duration; for a range like 20-25 min use the lower bound"),
});
export type Timer = z.infer<typeof Timer>;

/**
 * Claude's structured reading of a SourceRecipe. Positional (same order and count as the
 * source). Templates are the source text with every amount that scales with the recipe
 * wrapped as [[number]], so scaling can rewrite metric equivalents and in-step amounts too.
 */
export const Enrichment = z.object({
  servings: z.object({
    amount: z.number().nullable().describe("Numeric yield used for scaling, null if unknown"),
    label: z.string().describe('What the amount counts, e.g. "servings", "cookies", "loaf"'),
  }),
  ingredients: z.array(
    z.object({
      template: z.string().describe("The ingredient line with each scalable amount as [[decimal]]"),
      name: z.string().describe('Short everyday name, e.g. "butter", "yellow onion"'),
    }),
  ),
  steps: z.array(
    z.object({
      template: z.string().describe("The step text with each scalable ingredient amount as [[decimal]]"),
      ingredientIndexes: z.array(z.number()).describe("0-based indexes of ingredients this step uses"),
      timers: z.array(Timer).describe("Timed actions in this step; empty if none"),
    }),
  ),
});
export type Enrichment = z.infer<typeof Enrichment>;

export type Ingredient = {
  id: string;
  text: string;
  /** null until enriched (or if the model's template didn't match the source). */
  template: string | null;
  group: string | null;
  name: string;
};

export type Step = {
  id: string;
  text: string;
  template: string | null;
  group: string | null;
  ingredientIds: string[];
  timers: Timer[];
};

/** The working recipe the cook view renders and (from M2) the agent edits. */
export type Recipe = {
  title: string;
  description: string | null;
  meta: RecipeMeta;
  times: { prep: number | null; cook: number | null; total: number | null };
  servings: { amount: number | null; label: string; text: string | null };
  ingredients: Ingredient[];
  steps: Step[];
  enriched: boolean;
};
