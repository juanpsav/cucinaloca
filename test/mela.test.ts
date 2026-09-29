import { describe, expect, it } from "vitest";
import { melaFilename, toMela } from "@/lib/export/mela";
import type { Recipe } from "@/lib/recipe/types";

const recipe: Recipe = {
  title: "Crème Brûlée Tart",
  description: "Rich and crisp.",
  meta: { url: "https://example.com/tart", siteName: "Example", author: null, image: null },
  times: { prep: 25, cook: 110, total: null },
  servings: { amount: 4, label: "servings", text: "Serves 4" },
  ingredients: [
    { id: "i1", text: "200 g flour", template: "[[200]] g flour", group: "Crust", name: "flour" },
    { id: "i2", text: "2 eggs", template: "[[2|w]] eggs", group: "Crust", name: "eggs" },
    { id: "i3", text: "Sugar\nto taste", template: null, group: "Top", name: "sugar" },
  ],
  steps: [{ id: "s1", text: "Mix 200 g flour.", template: "Mix [[200]] g flour.", group: null, ingredientIds: [], timers: [] }],
  enriched: true,
};

describe("toMela", () => {
  it("exports the cook's version at the current scale with groups", () => {
    const m = toMela(recipe, 1.5, ["Leek instead of shallots"], "abc");
    expect(m).toMatchObject({
      id: "abc",
      title: "Crème Brûlée Tart (adapted)",
      text: "Rich and crisp.",
      yield: "6 servings",
      prepTime: "25 min",
      cookTime: "1 h 50 min",
      ingredients: "# Crust\n300 g flour\n3 eggs\n# Top\nSugar to taste",
      instructions: "Mix 300 g flour.",
      link: "https://example.com/tart",
    });
    expect(m.notes).toContain("* Leek instead of shallots");
    expect(m.notes).toContain("Scaled from 4 servings.");
    expect(m).not.toHaveProperty("totalTime");
  });

  it("keeps the original title when nothing changed", () => {
    expect(toMela(recipe, 1, [], "x")).toMatchObject({ title: "Crème Brûlée Tart", yield: "4 servings" });
    expect(toMela(recipe, 1, [], "x")).not.toHaveProperty("notes");
  });

  it("makes a safe filename", () => {
    expect(melaFilename("Crème Brûlée Tart (adapted)")).toBe("Creme-Brulee-Tart-adapted.melarecipe");
  });
});
