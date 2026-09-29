# Cucina Loca

**Cook any recipe, your way.** Open a recipe from anywhere in a clean cook view, then scale it, time it and follow it step by step. Nothing is saved: a session lives in your browser tab and disappears when you close it.

[cucinaloca.com](https://cucinaloca.com)

> v2 is a rebuild in progress. v1 (location-based ingredient suggestions) lives on `main`.

## How it works

- **Open a recipe:** paste a link, put `cucinaloca.com/` in front of any recipe URL, use the iPhone share-sheet shortcut (`/shortcut`), or add screenshots / paste the text when a site doesn't allow automated access.
- **Chrome extension** (`extension/`): a Manifest V3 side panel that frames the app and hands it the recipe read from the page you're on, so it also works on sites that block server-side fetching. It uses `activeTab` only (no standing access to any site); the app accepts the page via `postMessage` only from an extension parent, and `frame-ancestors` limits who can frame it.
- **Import:** schema.org JSON-LD first. If a page has no structured data, or you send screenshots or text, Claude extracts the recipe verbatim with structured outputs (vision for screenshots).
- **Enrich:** Claude reads the recipe once and returns *templates*: each line with only the amounts that should scale marked (`[[1.5]] cups ([[200]] g) flour`, but not the `14-oz` in `1 (14-oz) can`). It also links each step to its ingredients and finds the timers. Templates are checked word-for-word against the source, so the model can't quietly change the recipe.
- **Cook:** step focus shows exactly what each step needs, plus one-tap timers and screen wake lock.
- **Change it:** tell the assistant what you have, what you don't, who you're cooking for. A Claude agent (tool use, streamed) edits the recipe through typed operations: `edit_recipe` (atomic batches of ingredient/step updates; the same pure function validates on the server and applies in the browser), `set_servings` and `remember_preference`. Changes show inline against the original, and each reply can be undone as a unit.
- **Keep it:** "Save to Mela" exports your version (current scale, edits, groups, a note of what changed, the photo) as a [`.melarecipe`](https://mela.recipes/fileformat/) file: the share sheet on phones, a download on computers.

## Evals

`evals/chat/` tests the sous-chef on 36 requests across 6 recipes written for the eval (swaps, missing ingredients, diets and allergies with hidden sources, scaling, equipment, questions that must not touch the recipe, seasonality by hemisphere, French, and follow-ups). The runner calls the real agent and applies its edits exactly as the browser does, then scores four things:

- **Correct edits** (code): the final recipe really lost the pancetta, kept the right scale, left questions alone, saved or didn't save a preference.
- **Style rules** (code): no markdown, no "I've swapped…", no sign-offs, no internal ids, no leaked working notes, length limits.
- **Chef approves** and **sounds human** (Claude Sonnet 5.5 as judge, one property per call).

The graders are checked against empty, evasive and wrong answers (`npm run eval:chat -- --selftest`). The first baseline caught the model's working notes leaking into replies ("Or just remove it? They didn't say what they have…") in 13 of 72 runs. Fixing the streaming took that to 0 and style from 71% to 86%.

| 36 cases × 2 runs | Correct | Chef approves | Style | Sounds human |
|---|---|---|---|---|
| Baseline | 100% | 79% | 71% | 60% |
| Hide pre-tool text | 100% | 79% | 86% | 62% |

```bash
npm run eval:chat -- --reps 2          # about $1.60 and 3 minutes
```

On GitHub it runs on demand (Actions → Eval sous-chef chat), with `ANTHROPIC_API_KEY` set as a repository secret.

## Stack

Next.js 16 · React 19 · Tailwind 4 · Claude API (`claude-opus-5-5`: structured outputs, vision, streaming tool runner with strict Zod tools, prompt caching, server-side refusal fallback) · Zod · Upstash rate limiting · Vitest

## Development

```bash
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm install
npm run dev
npm test
```

To try the extension, load `extension/` unpacked at `chrome://extensions` (Developer mode). An unpacked copy talks to `http://localhost:3000`; a Web Store install talks to cucinaloca.com. `npm run ext:zip` builds the upload bundle.

## Roadmap

- [x] M0/M1: rebuild, cook view, import from link, screenshots or text
- [x] M2: chat agent that edits the recipe (swaps, scaling, equipment) with typed patches and diffs
- [x] M3: iOS Shortcut and Chrome side-panel extension (Web Store listing pending)
- [x] M4: Save to Mela
- [x] M5: evals
- [ ] M6: hands-free voice
