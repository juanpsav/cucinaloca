import type { ImportedRecipe, Recipe } from "@/lib/recipe/types";

export type AppliedChange = { id: string; summary: string; undone: boolean };

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** Recipe changes (and rescales) made by this reply. Undo reverts the whole reply. */
  changes: AppliedChange[];
  /** The recipe and scale before this reply, for undo. */
  before?: { recipe: Recipe; factor: number };
  remembered: string[];
  error?: string;
};

/**
 * A cook session lives in sessionStorage: it survives a reload of the tab and is gone
 * when the tab closes. Nothing is stored anywhere else.
 */
export type CookSession = {
  source: ImportedRecipe;
  recipe: Recipe;
  /** The recipe as first read (after enrichment): what changes are shown against. */
  base: Recipe | null;
  factor: number;
  checked: string[];
  current: string | null;
  chat: ChatMessage[];
};

const key = (id: string) => `cucinaloca:${id}`;

export function loadSession(id: string): CookSession | null {
  try {
    const raw = sessionStorage.getItem(key(id));
    if (!raw) return null;
    const s = JSON.parse(raw) as CookSession;
    return { ...s, base: s.base ?? null, chat: s.chat ?? [] };
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
