import { describe, expect, it } from "vitest";
import { applyEnrichment, fromImported } from "@/lib/recipe/build";
import { formatAmount, mapMarkers, renderTemplate, renderText } from "@/lib/recipe/scale";
import type { ImportedRecipe } from "@/lib/recipe/types";

const imported: ImportedRecipe = {
  title: "Cookies",
  description: null,
  yield: "Makes 16",
  prepMinutes: null,
  cookMinutes: 20,
  totalMinutes: 40,
  ingredients: [
    { text: "1½ cups plus 1 Tbsp. (200 g) all-purpose flour", group: null },
    { text: "1 (14-oz) can tomatoes", group: null },
  ],
  steps: [{ text: "Whisk 1½ cups flour. Bake 10–12 minutes.", group: null }],
  meta: { url: null, siteName: null, author: null, image: null },
  via: "jsonld",
};

describe("applyEnrichment", () => {
  const base = fromImported(imported);

  it("merges templates, links and timers", () => {
    const r = applyEnrichment(base, {
      servings: { amount: 16, label: "cookies" },
      ingredients: [
        { template: "[[1.5]] cups plus [[1]] Tbsp. ([[200]] g) all-purpose flour", name: "flour" },
        { template: "[[1]] (14-oz) can tomatoes", name: "canned tomatoes" },
      ],
      steps: [{ template: "Whisk [[1.5]] cups flour. Bake 10–12 minutes.", ingredientIndexes: [0, 0, 9], timers: [{ label: "Bake", seconds: 600 }] }],
    })!;
    expect(r.servings).toMatchObject({ amount: 16, label: "cookies" });
    expect(r.ingredients[0].template).toContain("[[200]]");
    expect(r.steps[0].ingredientIds).toEqual(["i1"]);
    expect(r.steps[0].timers).toHaveLength(1);
  });

  it("drops a template whose words drifted from the source", () => {
    const r = applyEnrichment(base, {
      servings: { amount: 16, label: "cookies" },
      ingredients: [
        { template: "[[1.5]] cups bread flour", name: "flour" },
        { template: "[[1]] (14-oz) can tomatoes", name: "tomatoes" },
      ],
      steps: [{ template: "Whisk flour.", ingredientIndexes: [], timers: [] }],
    })!;
    expect(r.ingredients[0].template).toBeNull();
    expect(r.ingredients[1].template).not.toBeNull();
    expect(r.steps[0].template).toBeNull();
  });

  it("rejects a mismatched shape", () => {
    expect(applyEnrichment(base, { servings: { amount: 1, label: "x" }, ingredients: [], steps: [] })).toBeNull();
  });
});

describe("scaling", () => {
  it("scales every marked amount", () => {
    const text = renderTemplate("[[1.5]] cups ([[200]] g) flour, 1 (14-oz) can", 2)
      .map((s) => s.text)
      .join("");
    expect(text).toBe("3 cups (400 g) flour, 1 (14-oz) can");
  });

  it("keeps the author's numbers at the original size", () => {
    const text = renderTemplate("([[113]] g) and [[1.5]] cups", 1).map((s) => s.text).join("");
    expect(text).toBe("(113 g) and 1½ cups");
  });

  it("rounds whole items", () => {
    expect(renderText("[[1|w]] large egg, [[2|w]] yolks, [[0.5]] tsp", 1.25)).toBe("1 large egg, 3 yolks, ⅝ tsp");
    expect(renderText("[[1|w]] egg", 0.25)).toBe("1 egg");
  });

  it("collapses a range that rounds to one number", () => {
    expect(renderText("[[2|w]]-[[3|w]] sprigs", 0.34)).toBe("1 sprigs");
    expect(renderText("[[2]]-[[3]] cloves", 2)).toBe("4-6 cloves");
  });

  it("maps marker values", () => {
    expect(mapMarkers("[[250]] g and [[2|w]] eggs", (n) => n / 1.25)).toBe("[[200]] g and [[1.6|w]] eggs");
  });

  it.each([
    [0.5, "½"], [0.33, "⅓"], [1.25, "1¼"], [2.95, "3"], [0.03, "⅛"], [12.4, "12"], [263, "265"], [7, "7"],
  ])("formats %s as %s", (n, s) => expect(formatAmount(n)).toBe(s));
});
