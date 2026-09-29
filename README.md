# Cucina Loca

**Cook any recipe, your way.** Open a recipe from anywhere in a clean cook view, then scale it, time it and follow it step by step. Nothing is saved: a session lives in your browser tab and disappears when you close it.

[cucinaloca.com](https://cucinaloca.com)

> v2 is a rebuild in progress. v1 (location-based ingredient suggestions) lives on `main`.

## How it works

- **Open a recipe:** paste a link, put `cucinaloca.com/` in front of any recipe URL, or add screenshots / paste the text when a site doesn't allow automated access.
- **Import:** schema.org JSON-LD first. If a page has no structured data, or you send screenshots or text, Claude extracts the recipe verbatim with structured outputs (vision for screenshots).
- **Enrich:** Claude reads the recipe once and returns *templates*: each line with only the amounts that should scale marked (`[[1.5]] cups ([[200]] g) flour`, but not the `14-oz` in `1 (14-oz) can`). It also links each step to its ingredients and finds the timers. Templates are checked word-for-word against the source, so the model can't quietly change the recipe.
- **Cook:** step focus shows exactly what each step needs, plus one-tap timers and screen wake lock.
- **Change it:** tell the assistant what you have, what you don't, who you're cooking for. A Claude agent (tool use, streamed) edits the recipe through typed operations: `edit_recipe` (atomic batches of ingredient/step updates; the same pure function validates on the server and applies in the browser), `set_servings` and `remember_preference`. Changes show inline against the original, and each reply can be undone as a unit.

## Stack

Next.js 16 · React 19 · Tailwind 4 · Claude API (`claude-opus-5-5`: structured outputs, vision, streaming tool runner with strict Zod tools, prompt caching, server-side refusal fallback) · Zod · Upstash rate limiting · Vitest

## Development

```bash
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm install
npm run dev
npm test
```

## Roadmap

- [x] M0/M1: rebuild, cook view, import from link, screenshots or text
- [x] M2: chat agent that edits the recipe (swaps, scaling, equipment) with typed patches and diffs
- [ ] M3: iOS Shortcut and Chrome side-panel extension
- [ ] M4: Save to Mela
- [ ] M5: evals
- [ ] M6: hands-free voice
