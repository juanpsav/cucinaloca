import { z } from "zod";
import { melaFilename, toMela } from "@/lib/export/mela";
import { fetchImage, parseRecipeUrl } from "@/lib/fetch-page";
import { checkLimit } from "@/lib/ratelimit";
import { Recipe } from "@/lib/recipe/types";

export const maxDuration = 30;

const Body = z.object({
  recipe: Recipe,
  factor: z.number().positive().max(50),
  changes: z.array(z.string().max(300)).max(50),
});

/** Build a .melarecipe of the cook's version, with the recipe photo embedded when there is one. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid recipe." }, { status: 400 });

  const limited = await checkLimit("export", request);
  if (limited) return limited;

  const { recipe, factor, changes } = parsed.data;
  const mela = toMela(recipe, factor, changes, crypto.randomUUID());
  if (recipe.meta.image) {
    try {
      const { data } = await fetchImage(parseRecipeUrl(recipe.meta.image));
      mela.images = [data.toString("base64")];
    } catch {
      // No photo is fine; the recipe is what matters.
    }
  }
  return new Response(JSON.stringify(mela), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${melaFilename(mela.title)}"`,
    },
  });
}
