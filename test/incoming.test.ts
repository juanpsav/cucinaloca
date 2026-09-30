import { describe, expect, it } from "vitest";
import { normalizeRecipeUrl, recipeFromPath } from "@/lib/incoming";

const R = "https://www.example.com/recipes/pasta?id=3&x=1";
const enc = encodeURIComponent;

describe("recipeFromPath", () => {
  it.each([
    ["prefix, as typed", `/${R}`],
    ["prefix with // collapsed", "/https:/www.example.com/recipes/pasta?id=3&x=1"],
    ["prefix, link fully encoded", `/${enc(R)}`],
    ["prefix, link encoded twice", `/${enc(enc(R))}`],
    ["our ?url= encoded by a Shortcut", `/cook%3Furl%3D${enc(R)}`],
    ["our ?url= and the link encoded twice", `/${enc(`cook?url=${enc(R)}`)}`],
    ["our ?url= encoded, link raw", `/cook%3Furl%3D${R}`],
  ])("%s", (_, path) => expect(recipeFromPath(path)).toBe(R));

  it("adds https to a bare domain", () => {
    expect(recipeFromPath("/www.example.com/recipes/pasta")).toBe("https://www.example.com/recipes/pasta");
  });

  it.each(["/", "/shortcut", "/extension", "/favicon.ico", "/icon-512.png"])("leaves our own page %s alone", (path) => {
    expect(recipeFromPath(path)).toBeNull();
  });
});

describe("normalizeRecipeUrl", () => {
  it.each([R, enc(R), enc(enc(R)), "https:/www.example.com/recipes/pasta?id=3&x=1"])("%s", (v) => expect(normalizeRecipeUrl(v)).toBe(R));
});
