import type { ImportedRecipe, Recipe } from "@/lib/recipe/types";

/**
 * A cook session lives in sessionStorage: it survives a reload of the tab and is gone
 * when the tab closes. Nothing is stored anywhere else.
 */
export type CookSession = {
  source: ImportedRecipe;
  recipe: Recipe;
  factor: number;
  checked: string[];
  current: string | null;
};

const key = (id: string) => `cucinaloca:${id}`;

export function loadSession(id: string): CookSession | null {
  try {
    const raw = sessionStorage.getItem(key(id));
    return raw ? (JSON.parse(raw) as CookSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(id: string, s: CookSession) {
  try {
    sessionStorage.setItem(key(id), JSON.stringify(s));
  } catch {
    // Storage full or blocked: the session just won't survive a reload.
  }
}

/** Hand an imported recipe (from screenshots/text on the home page) to /cook. */
export function stashImport(recipe: ImportedRecipe): string {
  const id = `local-${crypto.randomUUID().slice(0, 8)}`;
  try {
    sessionStorage.setItem(key(`pending:${id}`), JSON.stringify(recipe));
  } catch {}
  return id;
}

export function takeStashedImport(id: string): ImportedRecipe | null {
  try {
    const raw = sessionStorage.getItem(key(`pending:${id}`));
    return raw ? (JSON.parse(raw) as ImportedRecipe) : null;
  } catch {
    return null;
  }
}
