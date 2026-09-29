import { z } from "zod";
import { MARKER, mapMarkers, renderText } from "./scale";
import { Timer, type Ingredient, type Recipe, type Step } from "./types";

/**
 * One edit to the recipe. Flat (every field present, nullable) so it works as a strict tool schema.
 * Templates use the same markers as enrichment, written at the scale the cook currently sees.
 */
export const EditOp = z.object({
  op: z.enum(["update_ingredient", "add_ingredient", "remove_ingredient", "update_step", "add_step", "remove_step"]),
  id: z
    .string()
    .nullable()
    .describe("update/remove: the id to change. add: the id to insert after (null = at the start)."),
  template: z
    .string()
    .nullable()
    .describe("update/add: the full new line or step, with scalable amounts as [[decimal]] or [[decimal|w]]"),
  name: z.string().nullable().describe("update/add ingredient: short everyday name"),
  ingredientIds: z
    .array(z.string())
    .nullable()
    .describe('update/add step: ingredients the step uses; "+1", "+2" refer to ingredients added earlier in this change. null keeps the current list.'),
  timers: z.array(Timer).nullable().describe("update/add step: timed actions; null keeps the current timers"),
});
export type EditOp = z.infer<typeof EditOp>;

export const Change = z.object({
  summary: z.string().describe('What changed, for the cook, e.g. "Swapped shallots for leek"'),
  ops: z.array(EditOp),
});
export type Change = z.infer<typeof Change>;

export type ApplyResult = { ok: true; recipe: Recipe } | { ok: false; error: string };

/** Apply a change atomically: every op succeeds or the recipe is left as it was. */
export function applyChange(recipe: Recipe, change: Change, factor: number): ApplyResult {
  let ingredients = [...recipe.ingredients];
  let steps = [...recipe.steps];
  const added: string[] = [];
  const toOriginal = (tpl: string) => (factor === 1 ? tpl : mapMarkers(tpl, (n) => n / factor));
  const line = (tpl: string) => {
    const template = toOriginal(tpl.trim());
    const scalable = new RegExp(MARKER.source).test(template);
    return { text: scalable ? renderText(template, 1) : template, template: scalable ? template : null };
  };

  for (const [i, op] of change.ops.entries()) {
    const fail = (msg: string): ApplyResult => ({ ok: false, error: `Op ${i + 1} (${op.op}): ${msg}. Nothing was changed.` });
    const isIngredient = op.op.endsWith("ingredient");
    const list: (Ingredient | Step)[] = isIngredient ? ingredients : steps;
    const index = op.id == null ? -1 : list.findIndex((x) => x.id === op.id);

    if (op.op.startsWith("add")) {
      if (!op.template?.trim()) return fail("template is required");
      if (op.id != null && index < 0) return fail(`no item with id ${op.id} to insert after`);
    } else if (index < 0) {
      return fail(`no ${isIngredient ? "ingredient" : "step"} with id ${op.id}`);
    }
    if (op.op.startsWith("update") && !op.template?.trim()) return fail("template is required");

    const neighbour = list[index] ?? list[0];
    switch (op.op) {
      case "update_ingredient":
        ingredients[index] = { ...ingredients[index], ...line(op.template!), name: op.name ?? ingredients[index].name };
        break;
      case "add_ingredient": {
        const id = nextId(ingredients, "i_n");
        added.push(id);
        ingredients.splice(index + 1, 0, { id, ...line(op.template!), group: neighbour?.group ?? null, name: op.name ?? op.template! });
        break;
      }
      case "remove_ingredient":
        ingredients = ingredients.filter((x) => x.id !== op.id);
        steps = steps.map((s) => ({ ...s, ingredientIds: s.ingredientIds.filter((id) => id !== op.id) }));
        break;
      case "update_step":
      case "add_step": {
        // The step number is shown to the model as metadata; never let it leak into the text.
        const text = line(op.template!.replace(/^\s*step \d+\s*[.:)-]\s*/i, ""));
        let ingredientIds: string[] | null = null;
        if (op.ingredientIds) {
          ingredientIds = [];
          for (const ref of op.ingredientIds) {
            const id = /^\+\d+$/.test(ref) ? added[Number(ref.slice(1)) - 1] : ref;
            if (!id || !ingredients.some((x) => x.id === id)) return fail(`unknown ingredient ${ref}`);
            if (!ingredientIds.includes(id)) ingredientIds.push(id);
          }
        }
        if (op.op === "update_step") {
          const s = steps[index];
          steps[index] = { ...s, ...text, ingredientIds: ingredientIds ?? s.ingredientIds, timers: op.timers ?? s.timers };
        } else {
          const id = nextId(steps, "s_n");
          steps.splice(index + 1, 0, { id, ...text, group: neighbour?.group ?? null, ingredientIds: ingredientIds ?? [], timers: op.timers ?? [] });
        }
        break;
      }
      case "remove_step":
        steps = steps.filter((x) => x.id !== op.id);
        break;
    }
  }
  if (steps.length === 0) return { ok: false, error: "A recipe needs at least one step. Nothing was changed." };
  return { ok: true, recipe: { ...recipe, ingredients, steps } };
}

/** New items get ids the original never uses, so diffs against it stay unambiguous. */
function nextId(list: { id: string }[], prefix: string) {
  const used = list.map((x) => (x.id.startsWith(prefix) ? Number(x.id.slice(prefix.length)) : 0));
  return `${prefix}${Math.max(0, ...used) + 1}`;
}

/** The recipe as the model sees it: ids, templates at the current scale, step links and timers. */
export function describeRecipe(recipe: Recipe, factor: number): string {
  const at = (x: { text: string; template: string | null }) => (x.template ? mapMarkers(x.template, (n) => n * factor) : x.text);
  const servings = recipe.servings.amount
    ? `${round(recipe.servings.amount * factor)} ${recipe.servings.label}${factor !== 1 ? ` (scaled ×${round(factor)} from ${recipe.servings.amount})` : ""}`
    : `${recipe.servings.text ?? "not stated"}${factor !== 1 ? ` (scaled ×${round(factor)})` : ""}`;
  const lines = [`Title: ${recipe.title}`, `Servings: ${servings}`, "", "Ingredients:"];
  for (const ing of recipe.ingredients) lines.push(`[${ing.id}]${ing.group ? ` (${ing.group})` : ""} ${at(ing)}`);
  lines.push("", "Steps:");
  for (const [n, s] of recipe.steps.entries()) {
    const extra = [
      s.ingredientIds.length ? `uses ${s.ingredientIds.join(", ")}` : "",
      s.timers.length ? `timers: ${s.timers.map((t) => `${t.label} ${t.seconds}s`).join("; ")}` : "",
    ].filter(Boolean);
    lines.push(`[${s.id} · step ${n + 1}]${s.group ? ` (${s.group})` : ""} ${at(s)}${extra.length ? `  {${extra.join(" | ")}}` : ""}`);
  }
  return lines.join("\n");
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
