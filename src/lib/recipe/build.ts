import { MARKER } from "./scale";
import type { Enrichment, ImportedRecipe, Recipe } from "./types";

/** A renderable recipe straight from the source, before Claude has read it. */
export function fromImported(src: ImportedRecipe): Recipe {
  return {
    title: src.title,
    description: src.description,
    meta: src.meta,
    times: { prep: src.prepMinutes, cook: src.cookMinutes, total: src.totalMinutes },
    servings: {
      amount: leadingNumber(src.yield),
      label: "servings",
      text: src.yield && /^\d+$/.test(src.yield) ? `${src.yield} servings` : src.yield,
    },
    ingredients: src.ingredients.map((ing, i) => ({
      id: `i${i + 1}`,
      text: ing.text,
      template: null,
      group: ing.group,
      name: ing.text,
    })),
    steps: src.steps.map((step, i) => ({
      id: `s${i + 1}`,
      text: step.text,
      template: null,
      group: step.group,
      ingredientIds: [],
      timers: [],
    })),
    enriched: false,
  };
}

/**
 * Merge Claude's positional enrichment into the recipe. Returns null if the shapes
 * disagree, so the caller keeps the plain version rather than mislabelled data.
 * Any template whose words differ from the source is dropped (the line just won't scale).
 */
export function applyEnrichment(recipe: Recipe, e: Enrichment): Recipe | null {
  if (e.ingredients.length !== recipe.ingredients.length || e.steps.length !== recipe.steps.length) {
    return null;
  }
  const ids = recipe.ingredients.map((i) => i.id);
  return {
    ...recipe,
    servings: { ...recipe.servings, amount: e.servings.amount, label: e.servings.label },
    ingredients: recipe.ingredients.map((ing, i) => ({
      ...ing,
      name: e.ingredients[i].name,
      template: faithful(ing.text, e.ingredients[i].template),
    })),
    steps: recipe.steps.map((step, i) => ({
      ...step,
      template: faithful(step.text, e.steps[i].template),
      ingredientIds: [...new Set(e.steps[i].ingredientIndexes)].filter((n) => n >= 0 && n < ids.length).map((n) => ids[n]),
      timers: e.steps[i].timers.filter((t) => t.seconds > 0),
    })),
    enriched: true,
  };
}

/** Same words as the source once numbers are set aside; amounts may be re-spelled (1 1/2 -> [[1.5]]). */
function faithful(text: string, template: string): string | null {
  if (!new RegExp(MARKER.source).test(template)) return null;
  const words = (s: string) => s.replace(MARKER, " ").replace(/[\d\s.,/⁄½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞-]+/g, "").toLowerCase();
  return words(text) === words(template) ? template : null;
}

function leadingNumber(s: string | null): number | null {
  const m = s?.match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}
