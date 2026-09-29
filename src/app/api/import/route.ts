import { z } from "zod";
import { ClaudeError } from "@/lib/claude";
import { FetchPageError, fetchPage, parseRecipeUrl } from "@/lib/fetch-page";
import { checkLimit } from "@/lib/ratelimit";
import { extractFromHtml, extractFromImages, extractFromText } from "@/lib/recipe/ai";
import { extractFromScripts, extractJsonLd } from "@/lib/recipe/jsonld";

export const maxDuration = 60;

// Most specific first: zod objects ignore unknown keys, so { url } would also match the others.
const OptionalUrl = z.string().max(2048).nullable().optional();
const Body = z.union([
  z.object({
    url: OptionalUrl,
    images: z
      .array(z.object({ mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]), data: z.string().max(3_000_000) }))
      .min(1)
      .max(6),
  }),
  // Read by the browser extension from the page the cook has open.
  z.object({
    url: z.string().max(2048),
    page: z.object({
      title: z.string().max(500),
      siteName: z.string().max(200).nullable(),
      jsonLd: z.array(z.string().max(500_000)).max(20),
      text: z.string().max(60_000),
    }),
  }),
  z.object({ url: OptionalUrl, text: z.string().min(50).max(60_000) }),
  z.object({ url: z.string().max(2048) }),
]);

export type ImportError = { error: string; kind: "invalid" | "blocked" | "failed" | "not-a-recipe" };

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Send a recipe link or screenshots.", "invalid", 400);

  const limited = await checkLimit("import", request);
  if (limited) return limited;

  try {
    if ("images" in parsed.data) {
      const url = parsed.data.url ? parseRecipeUrl(parsed.data.url).toString() : null;
      const recipe = await extractFromImages(parsed.data.images, url);
      return recipe ? Response.json(recipe) : fail("Couldn't find a recipe in those images.", "not-a-recipe", 422);
    }
    if ("page" in parsed.data) {
      const url = parseRecipeUrl(parsed.data.url).toString();
      const { page } = parsed.data;
      const recipe =
        extractFromScripts(page.jsonLd, url, page.siteName) ??
        (page.text.length >= 200 ? await extractFromText(`${page.title}\n\n${page.text}`, url) : null);
      return recipe ? Response.json(recipe) : fail("This page doesn't seem to have a recipe on it.", "not-a-recipe", 422);
    }
    if ("text" in parsed.data) {
      const url = parsed.data.url ? parseRecipeUrl(parsed.data.url).toString() : null;
      const recipe = await extractFromText(parsed.data.text, url);
      return recipe ? Response.json(recipe) : fail("Couldn't find a recipe in that text.", "not-a-recipe", 422);
    }

    const url = parseRecipeUrl(parsed.data.url);
    const { html, finalUrl } = await fetchPage(url);
    const recipe = extractJsonLd(html, finalUrl) ?? (await extractFromHtml(html, finalUrl));
    return recipe ? Response.json(recipe) : fail("That page doesn't seem to have a recipe on it.", "not-a-recipe", 422);
  } catch (e) {
    if (e instanceof FetchPageError) return fail(e.message, e.kind, e.kind === "invalid" ? 400 : 422);
    if (e instanceof ClaudeError) return fail(e.message, "failed", 502);
    console.error("import failed", e);
    return fail("Something went wrong reading that recipe.", "failed", 500);
  }
}

function fail(error: string, kind: ImportError["kind"], status: number) {
  return Response.json({ error, kind } satisfies ImportError, { status });
}
