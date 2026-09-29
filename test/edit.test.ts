import { describe, expect, it } from "vitest";
import { diffList } from "@/lib/recipe/diff";
import { applyChange, describeRecipe, type EditOp } from "@/lib/recipe/edit";
import type { Recipe } from "@/lib/recipe/types";

const recipe: Recipe = {
  title: "Pasta",
  description: null,
  meta: { url: null, siteName: null, author: null, image: null },
  times: { prep: null, cook: null, total: null },
  servings: { amount: 4, label: "servings", text: "4" },
  ingredients: [
    { id: "i1", text: "2 shallots, minced", template: "[[2|w]] shallots, minced", group: null, name: "shallot" },
    { id: "i2", text: "200 g pasta", template: "[[200]] g pasta", group: null, name: "pasta" },
    { id: "i3", text: "Salt", template: null, group: null, name: "salt" },
  ],
  steps: [
    { id: "s1", text: "Sweat the shallots 3 minutes.", template: null, group: null, ingredientIds: ["i1"], timers: [{ label: "Sweat", seconds: 180 }] },
    { id: "s2", text: "Cook 200 g pasta.", template: "Cook [[200]] g pasta.", group: null, ingredientIds: ["i2", "i3"], timers: [] },
  ],
  enriched: true,
};

const op = (o: Partial<EditOp> & Pick<EditOp, "op">): EditOp => ({ id: null, template: null, name: null, ingredientIds: null, timers: null, ...o });

describe("applyChange", () => {
  it("swaps an ingredient and rewrites its step", () => {
    const r = applyChange(
      recipe,
      {
        summary: "Leek instead of shallots",
        ops: [
          op({ op: "update_ingredient", id: "i1", template: "[[1|w]] leek, thinly sliced", name: "leek" }),
          op({ op: "update_step", id: "s1", template: "Sweat the leek 6 minutes.", timers: [{ label: "Sweat leek", seconds: 360 }] }),
        ],
      },
      1,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.recipe.ingredients[0]).toMatchObject({ id: "i1", text: "1 leek, thinly sliced", name: "leek" });
    expect(r.recipe.steps[0]).toMatchObject({ text: "Sweat the leek 6 minutes.", template: null, ingredientIds: ["i1"] });
    expect(r.recipe.steps[0].timers[0].seconds).toBe(360);
  });

  it("stores amounts written at the current scale in original units", () => {
    const r = applyChange(recipe, { summary: "More pasta", ops: [op({ op: "update_ingredient", id: "i2", template: "[[500]] g pasta" })] }, 2);
    expect(r.ok && r.recipe.ingredients[1]).toMatchObject({ template: "[[250]] g pasta", text: "250 g pasta" });
  });

  it("adds an ingredient and links it with +1", () => {
    const r = applyChange(
      recipe,
      {
        summary: "Add lemon",
        ops: [
          op({ op: "add_ingredient", id: "i2", template: "[[1|w]] lemon", name: "lemon" }),
          op({ op: "add_step", id: "s2", template: "Squeeze the lemon over.", ingredientIds: ["+1"] }),
        ],
      },
      1,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.recipe.ingredients.map((i) => i.id)).toEqual(["i1", "i2", "i_n1", "i3"]);
    expect(r.recipe.steps[2]).toMatchObject({ id: "s_n1", ingredientIds: ["i_n1"] });
  });

  it("keeps step numbers out of step text", () => {
    const r = applyChange(recipe, { summary: "x", ops: [op({ op: "update_step", id: "s1", template: "Step 1. Sweat it." })] }, 1);
    expect(r.ok && r.recipe.steps[0].text).toBe("Sweat it.");
  });

  it("removes an ingredient everywhere", () => {
    const r = applyChange(recipe, { summary: "No salt", ops: [op({ op: "remove_ingredient", id: "i3" })] }, 1);
    expect(r.ok && r.recipe.steps[1].ingredientIds).toEqual(["i2"]);
  });

  it("is atomic on error", () => {
    const r = applyChange(
      recipe,
      { summary: "x", ops: [op({ op: "remove_ingredient", id: "i3" }), op({ op: "update_step", id: "s9", template: "x" })] },
      1,
    );
    expect(r).toMatchObject({ ok: false });
    expect(recipe.ingredients).toHaveLength(3);
  });
});

describe("describeRecipe", () => {
  it("shows ids, links and templates at the current scale", () => {
    const text = describeRecipe(recipe, 1.5);
    expect(text).toContain("Servings: 6 servings (scaled ×1.5 from 4)");
    expect(text).toContain("[i2] [[300]] g pasta");
    expect(text).toContain("[s1 · step 1] Sweat the shallots 3 minutes.  {uses i1 | timers: Sweat 180s}");
  });
});

describe("diffList", () => {
  const base = [
    { id: "a", text: "A" },
    { id: "b", text: "B" },
    { id: "c", text: "C" },
  ];
  it("marks changed, added and removed items in place", () => {
    const d = diffList([{ id: "a", text: "A2" }, { id: "n", text: "N" }, { id: "c", text: "C" }], base);
    expect(d.map((x) => `${x.item.id}:${x.status}`)).toEqual(["a:changed", "b:removed", "n:added", "c:same"]);
    expect(d[0].before?.text).toBe("A");
  });
  it("keeps a removed first item at the top", () => {
    expect(diffList([{ id: "b", text: "B" }], base).map((x) => x.item.id)).toEqual(["a", "b", "c"]);
  });
});
