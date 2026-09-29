import * as cheerio from "cheerio";
import { z } from "zod";
import { structured } from "@/lib/claude";
import { Enrichment, SourceRecipe, type ImageInput, type ImportedRecipe, type RecipeMeta } from "./types";

const Extraction = z.object({
  found: z.boolean().describe("false if the input doesn't contain a recipe"),
  recipe: SourceRecipe.nullable(),
});

const EXTRACT_SYSTEM = `You extract recipes from web pages and photos for a cooking assistant.
Copy the recipe exactly as written, in its original language: every ingredient line and every instruction step, verbatim. Don't fix, translate, summarize or add anything. Skip everything that isn't the recipe itself (stories, ads, comments, nutrition).
Split instructions into the steps the author numbered or paragraphed. Keep section headings (e.g. "For the sauce") as the group of the lines beneath them.
If there is no recipe, set found to false.`;

/** Page text -> recipe, for pages without schema.org markup. */
export async function extractFromHtml(html: string, url: string): Promise<ImportedRecipe | null> {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe, nav, footer, header, aside, form").remove();
  const root = $("article").first().length ? $("article").first() : $("main").first().length ? $("main").first() : $("body");
  // Recipe pages are long mostly because of stories and comments; the recipe sits well inside this.
  const text = root.text().replace(/\s+/g, " ").trim().slice(0, 60_000);
  if (text.length < 200) return null;

  const recipe = await extractFromText(text, url);
  if (!recipe) return null;
  const meta: RecipeMeta = {
    url,
    siteName: $('meta[property="og:site_name"]').attr("content") ?? hostname(url),
    author: $('meta[name="author"]').attr("content") ?? null,
    image: $('meta[property="og:image"]').attr("content") ?? null,
  };
  return { ...recipe, meta, via: "page-text" };
}

/** Text the user copied from a recipe page (or anywhere) -> recipe. */
export async function extractFromText(text: string, url: string | null): Promise<ImportedRecipe | null> {
  const out = await structured({
    schema: Extraction,
    system: EXTRACT_SYSTEM,
    content: [{ type: "text", text: url ? `Page: ${url}\n\n${text}` : text }],
  });
  if (!out.found || !out.recipe) return null;
  return { ...out.recipe, meta: { url, siteName: url ? hostname(url) : null, author: null, image: null }, via: "page-text" };
}

function hostname(url: string) {
  return new URL(url).hostname.replace(/^www\./, "");
}

/** Screenshots or photos of a recipe (a blocked site, a cookbook page) -> recipe. */
export async function extractFromImages(images: ImageInput[], url: string | null): Promise<ImportedRecipe | null> {
  const out = await structured({
    schema: Extraction,
    system: EXTRACT_SYSTEM,
    content: [
      ...images.map((img) => ({
        type: "image" as const,
        source: { type: "base64" as const, media_type: img.mediaType, data: img.data },
      })),
      {
        type: "text",
        text:
          images.length > 1
            ? "These images are consecutive parts of one recipe (e.g. screenshots scrolled down a page). Combine them without duplicating lines that appear in two images."
            : "Extract the recipe in this image.",
      },
    ],
  });
  if (!out.found || !out.recipe) return null;
  return { ...out.recipe, meta: { url, siteName: url ? hostname(url) : null, author: null, image: null }, via: "image" };
}

const ENRICH_SYSTEM = `You prepare a recipe for an interactive cook view. You receive numbered ingredient lines and steps; return one entry per line and per step, same order, same count.

For every ingredient line and step, return a template: the text copied exactly, with each amount that should change when the recipe is scaled replaced by [[decimal]].
- Scale: ingredient quantities, including metric/imperial equivalents in parentheses and amounts restated inside steps ("add 1 tbsp oil" -> "add [[1]] tbsp oil").
- Don't scale: package sizes ("1 (14-oz) can" -> "[[1]] (14-oz) can"), temperatures, times, pan or dish sizes, step numbers, "Serves 4".
- Write fractions and mixed numbers as decimals: "1½" or "1 1/2" -> [[1.5]], "⅓" -> [[0.333]]. For ranges like "2-3 cloves" mark both: "[[2]]-[[3]] cloves".
- Change nothing else: same words, punctuation, spelling and language.

name: the everyday name of the ingredient, short, in the recipe's language ("flour", "yellow onion").
ingredientIndexes: 0-based indexes of the ingredient lines a step uses, including ones referred to indirectly ("the dry ingredients", "the sauce").
timers: each wait or cook time in a step the cook might want to time, with a short label ("Simmer sauce"). Skip vague ones ("until golden") and totals already covered by another timer.
servings: the numeric yield used for scaling and what it counts.`;

export async function enrich(src: Pick<ImportedRecipe, "title" | "yield" | "ingredients" | "steps">) {
  const listing = [
    `Title: ${src.title}`,
    `Yield: ${src.yield ?? "not stated"}`,
    "",
    "Ingredients:",
    ...src.ingredients.map((ing, i) => `${i}. ${ing.group ? `[${ing.group}] ` : ""}${ing.text}`),
    "",
    "Steps:",
    ...src.steps.map((s, i) => `${i}. ${s.group ? `[${s.group}] ` : ""}${s.text}`),
  ].join("\n");
  return structured({ schema: Enrichment, system: ENRICH_SYSTEM, content: [{ type: "text", text: listing }] });
}
