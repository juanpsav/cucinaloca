import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractJsonLd, minutes } from "@/lib/recipe/jsonld";

const page = (ld: unknown) =>
  `<html><head><meta property="og:site_name" content="Test Kitchen"><script type="application/ld+json">${JSON.stringify(ld)}</script></head></html>`;

describe("extractJsonLd", () => {
  it("reads a recipe nested in @graph with sections and entities", () => {
    const r = extractJsonLd(
      page({
        "@graph": [
          { "@type": "WebPage" },
          {
            "@type": ["Recipe"],
            name: "Tomato &amp; Butter Pasta",
            recipeYield: ["4", "4 servings"],
            totalTime: "PT1H5M",
            author: [{ "@type": "Person", name: "Marcella" }],
            image: { url: "https://x.test/p.jpg" },
            recipeIngredient: ["1 (28-oz) can whole tomatoes", "5 tbsp butter", " "],
            recipeInstructions: [
              { "@type": "HowToSection", name: "Sauce", itemListElement: [{ "@type": "HowToStep", text: "Simmer <b>45 minutes</b>." }] },
              { "@type": "HowToStep", text: "Toss with pasta." },
            ],
          },
        ],
      }),
      "https://www.example.com/pasta",
    );
    expect(r).toMatchObject({
      title: "Tomato & Butter Pasta",
      yield: "4 servings",
      totalMinutes: 65,
      ingredients: [{ text: "1 (28-oz) can whole tomatoes" }, { text: "5 tbsp butter" }],
      steps: [
        { text: "Simmer 45 minutes.", group: "Sauce" },
        { text: "Toss with pasta.", group: null },
      ],
      meta: { siteName: "Test Kitchen", author: "Marcella", image: "https://x.test/p.jpg" },
    });
  });

  it("splits a single newline-separated instructions string", () => {
    const r = extractJsonLd(
      page({ "@type": "Recipe", name: "X", recipeIngredient: ["a"], recipeInstructions: "Do one.\nDo two." }),
      null,
    );
    expect(r?.steps.map((s) => s.text)).toEqual(["Do one.", "Do two."]);
  });

  it("returns null without a usable recipe", () => {
    expect(extractJsonLd(page({ "@type": "Article", name: "X" }), null)).toBeNull();
    expect(extractJsonLd("<html></html>", null)).toBeNull();
  });
});

describe("minutes", () => {
  it.each([
    ["PT25M", 25],
    ["PT1H50M", 110],
    ["P0DT2H", 120],
    ["20 minutes", 20],
    ["1 hour 10 mins", 70],
    ["", null],
    ["PT0M", null],
  ])("%s -> %s", (input, expected) => expect(minutes(input)).toBe(expected));
});

// Real publisher pages are kept locally only (gitignored); these run when present.
const realDir = path.join(__dirname, "fixtures/real");
const real = fs.existsSync(realDir) ? fs.readdirSync(realDir).filter((f) => f.endsWith(".html")) : [];
describe.skipIf(real.length === 0)("real pages", () => {
  it.each(real)("%s", (file) => {
    const r = extractJsonLd(fs.readFileSync(path.join(realDir, file), "utf8"), null);
    expect(r).not.toBeNull();
    expect(r!.ingredients.length).toBeGreaterThan(0);
    expect(r!.steps.length).toBeGreaterThan(0);
  });
});
