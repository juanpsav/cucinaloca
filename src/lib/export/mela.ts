import { formatAmount, renderText } from "@/lib/recipe/scale";
import type { Recipe } from "@/lib/recipe/types";

/** Mela's documented .melarecipe JSON (https://mela.recipes/fileformat/). */
export type MelaRecipe = {
  id: string;
  title: string;
  text?: string;
  images?: string[];
  yield?: string;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  ingredients?: string;
  instructions?: string;
  notes?: string;
  link?: string;
};

/**
 * The cook's version as it stands: current scale, every edit, group headings.
 * A fresh id so it never replaces a copy of the original the cook already saved in Mela
 * (Mela uses the page URL as id for web imports).
 */
export function toMela(recipe: Recipe, factor: number, changes: string[], id: string): MelaRecipe {
  const line = (x: { text: string; template: string | null }) => oneLine(x.template ? renderText(x.template, factor) : x.text);
  const withGroups = <T extends { group: string | null }>(items: T[], render: (x: T) => string) => {
    const out: string[] = [];
    items.forEach((x, i) => {
      if (x.group && x.group !== items[i - 1]?.group) out.push(`# ${oneLine(x.group)}`);
      out.push(render(x));
    });
    return out.join("\n");
  };

  const servings = recipe.servings;
  const scaled = factor !== 1;
  const yieldText =
    servings.amount != null ? `${formatAmount(servings.amount * factor)} ${servings.label}` : scaled ? `${servings.text ?? ""} ×${formatAmount(factor)}`.trim() : servings.text;

  const notes = [
    changes.length ? `**Adapted with Cucina Loca**\n${changes.map((c) => `* ${oneLine(c)}`).join("\n")}` : null,
    scaled && servings.amount != null ? `Scaled from ${formatAmount(servings.amount)} ${servings.label}.` : null,
  ].filter(Boolean);

  return clean({
    id,
    title: changes.length ? `${recipe.title} (adapted)` : recipe.title,
    text: recipe.description ?? undefined,
    yield: yieldText ?? undefined,
    prepTime: minutesText(recipe.times.prep),
    cookTime: minutesText(recipe.times.cook),
    totalTime: minutesText(recipe.times.total),
    ingredients: withGroups(recipe.ingredients, line),
    instructions: withGroups(recipe.steps, line),
    notes: notes.length ? notes.join("\n\n") : undefined,
    link: recipe.meta.url ?? recipe.meta.siteName ?? undefined,
  });
}

export function melaFilename(title: string) {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${slug || "recipe"}.melarecipe`;
}

/** Mela separates lines with \n, so a line can't contain one; a leading # would make it a heading. */
function oneLine(s: string) {
  return s.replace(/\s*\n+\s*/g, " ").replace(/^#+\s*/, "").trim();
}

function minutesText(min: number | null): string | undefined {
  if (min == null) return undefined;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
}

function clean<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== "")) as T;
}
