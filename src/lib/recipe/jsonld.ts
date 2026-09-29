import * as cheerio from "cheerio";
import type { ImportedRecipe, RecipeMeta, SourceRecipe } from "./types";

type Node = Record<string, unknown>;

/** Extract a schema.org Recipe from a page's JSON-LD, or null if there isn't one. */
export function extractJsonLd(html: string, url: string | null): ImportedRecipe | null {
  const $ = cheerio.load(html);
  let node: Node | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (node) return;
    const json = parseLoose($(el).text());
    if (json !== undefined) node = findRecipe(json);
  });
  if (!node) return null;
  const r: Node = node;

  const ingredients = toArray(r.recipeIngredient ?? r.ingredients)
    .map((x) => clean(String(x)))
    .filter(Boolean)
    .map((text) => ({ text, group: null }));
  const steps = instructions(r.recipeInstructions);
  const title = clean(str(r.name) ?? "");
  if (!title || ingredients.length === 0 || steps.length === 0) return null;

  const source: SourceRecipe = {
    title,
    description: str(r.description) ? clean(str(r.description)!) : null,
    yield: recipeYield(r.recipeYield),
    prepMinutes: minutes(r.prepTime),
    cookMinutes: minutes(r.cookTime),
    totalMinutes: minutes(r.totalTime),
    ingredients,
    steps,
  };
  const meta: RecipeMeta = {
    url,
    siteName: $('meta[property="og:site_name"]').attr("content") ?? name(r.publisher) ?? hostname(url),
    author: name(r.author),
    image: image(r.image),
  };
  return { ...source, meta, via: "jsonld" };
}

function parseLoose(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // Some sites emit raw newlines/tabs inside strings.
    try {
      return JSON.parse(text.replace(/[\u0000-\u001f]+/g, " "));
    } catch {
      return undefined;
    }
  }
}

function findRecipe(n: unknown): Node | null {
  if (Array.isArray(n)) {
    for (const x of n) {
      const r = findRecipe(x);
      if (r) return r;
    }
    return null;
  }
  if (!n || typeof n !== "object") return null;
  const node = n as Node;
  if (toArray(node["@type"]).includes("Recipe")) return node;
  return findRecipe(node["@graph"]) ?? findRecipe(node.mainEntity);
}

function instructions(v: unknown): SourceRecipe["steps"] {
  const out: SourceRecipe["steps"] = [];
  const walk = (x: unknown, group: string | null) => {
    if (typeof x === "string") {
      // A single string may hold every step separated by newlines.
      for (const line of x.split(/\n+/)) {
        const text = clean(line);
        if (text) out.push({ text, group });
      }
    } else if (Array.isArray(x)) {
      x.forEach((y) => walk(y, group));
    } else if (x && typeof x === "object") {
      const node = x as Node;
      if (toArray(node["@type"]).includes("HowToSection")) {
        walk(node.itemListElement, str(node.name) ? clean(str(node.name)!) : group);
      } else {
        const text = clean(str(node.text) ?? str(node.name) ?? "");
        if (text) out.push({ text, group });
      }
    }
  };
  walk(v, null);
  return out;
}

function recipeYield(v: unknown): string | null {
  const parts = toArray(v).map((x) => clean(String(x))).filter(Boolean);
  // Prefer the most descriptive form, e.g. ["36", "36 cookies"] -> "36 cookies".
  return parts.sort((a, b) => b.length - a.length)[0] ?? null;
}

/** ISO 8601 durations (PT1H30M) and loose text ("20 minutes", "1 hour 10 mins"). */
export function minutes(v: unknown): number | null {
  const s = str(v);
  if (!s) return null;
  const iso = s.match(/^P(?:(\d+)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
  if (iso) {
    const [, d, h, m, sec] = iso.map((x) => Number(x ?? 0));
    const total = Math.round(d * 1440 + h * 60 + m + sec / 60);
    return total > 0 ? total : null;
  }
  const h = s.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hour)/i);
  const m = s.match(/(\d+)\s*(?:m|min)/i);
  const total = Math.round((h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0));
  return total > 0 ? total : null;
}

function image(v: unknown): string | null {
  const first = toArray(v)[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object") return str((first as Node).url) ?? null;
  return null;
}

function name(v: unknown): string | null {
  const names = toArray(v)
    .map((x) => (typeof x === "string" ? x : x && typeof x === "object" ? str((x as Node).name) : null))
    .filter((x): x is string => !!x);
  return names.length ? clean(names.join(", ")) : null;
}

function hostname(url: string | null): string | null {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : null;
  } catch {
    return null;
  }
}

function toArray(v: unknown): unknown[] {
  return v == null ? [] : Array.isArray(v) ? v : [v];
}

function str(v: unknown): string | null {
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : null;
}

/** Decode entities, drop tags, collapse whitespace. */
function clean(s: string): string {
  return cheerio.load(`<p>${s}</p>`)("p").text().replace(/\s+/g, " ").trim();
}
