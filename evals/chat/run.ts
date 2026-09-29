/**
 * Sous-chef chat eval: runs the real agent (src/lib/chat/agent.ts) on each case, applies its
 * edits exactly as the browser does, grades the result, and writes
 * .claude/hillclimb/chat/<variant>/{results.jsonl, traces/, errors.jsonl}.
 *
 *   npm run eval:chat -- [--variant baseline] [--reps 1] [--only id,id] [--concurrency 4] [--timeout-s 180]
 *   npm run eval:chat -- --selftest     # checks the graders fail empty and wrong answers
 */
import "./env";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import type { BetaMessage, BetaUsage } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { runAgent, SYSTEM, toMessages } from "@/lib/chat/agent";
import type { ChatEvent, ChatRequest } from "@/lib/chat/protocol";
import { MODEL } from "@/lib/claude";
import { applyChange } from "@/lib/recipe/edit";
import type { Recipe } from "@/lib/recipe/types";
import { CASES, type Case } from "./cases";
import { DEFAULT_CONTEXT, gradeProgrammatic, judge, JUDGE_MODEL, type Outcome } from "./grade";
import { RECIPES } from "./recipes";

const { values: args } = parseArgs({
  options: {
    variant: { type: "string", default: "baseline" },
    reps: { type: "string", default: "1" },
    only: { type: "string" },
    concurrency: { type: "string", default: "4" },
    "timeout-s": { type: "string", default: "180" },
    selftest: { type: "boolean", default: false },
  },
});

const FLOW = path.join(".claude", "hillclimb", "chat");
const OUT = path.join(FLOW, args.variant!);
const REPS = Number(args.reps);
const TIMEOUT_MS = Number(args["timeout-s"]) * 1000;

// First-party prices per million tokens (cache reads 0.1x input, cache writes 1.25x input).
const PRICES: Record<string, { in: number; out: number }> = {
  "claude-opus-5-5": { in: 4, out: 20 },
  "claude-sonnet-5-5": { in: 2, out: 10 },
  "claude-opus-4-8": { in: 5, out: 25 },
};

type Usage = { input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number };
type Turn = { role: "system" | "user" | "assistant" | "tool_call" | "tool_result"; content: string; name?: string; thinking?: string };

const zeroUsage = (): Usage => ({ input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 });
function addUsage(total: Usage, u: BetaUsage) {
  total.input_tokens += u.input_tokens ?? 0;
  total.output_tokens += u.output_tokens ?? 0;
  total.cache_read_input_tokens += u.cache_read_input_tokens ?? 0;
  total.cache_creation_input_tokens += u.cache_creation_input_tokens ?? 0;
}
function cost(model: string, u: Usage) {
  const p = PRICES[model];
  if (!p) return NaN;
  return (u.input_tokens * p.in + u.output_tokens * p.out + u.cache_read_input_tokens * p.in * 0.1 + u.cache_creation_input_tokens * p.in * 1.25) / 1e6;
}

class HarnessError extends Error {
  constructor(readonly cls: "timeout" | "api" | "model_mismatch" | "grader", message: string) {
    super(message);
  }
}

function startingRecipe(c: Case): Recipe {
  let recipe = structuredClone(RECIPES[c.recipe]);
  for (const change of c.setup ?? []) {
    const r = applyChange(recipe, change, 1);
    if (!r.ok) throw new Error(`case ${c.id}: setup failed: ${r.error}`);
    recipe = r.recipe;
  }
  return recipe;
}

async function runCase(c: Case) {
  const before = startingRecipe(c);
  const req: ChatRequest = {
    recipe: before,
    factor: c.factor ?? 1,
    turns: [...(c.history ?? []), { role: "user", text: c.message, changes: [] }],
    preferences: c.preferences ?? [],
    context: c.context ?? DEFAULT_CONTEXT,
  };

  // Mirror the browser (src/hooks/useChat.ts): apply each change as it streams in.
  const o: Outcome = { before, after: before, factorBefore: req.factor, factorAfter: req.factor, reply: "", changes: [], remembered: [], preToolNotes: [] };
  let refused = false;
  const emit = (e: ChatEvent) => {
    if (e.type === "text") o.reply += e.text;
    else if (e.type === "change") {
      const r = applyChange(o.after, e.change, e.factor);
      if (r.ok) {
        o.after = r.recipe;
        o.changes.push(e.change.summary);
      }
    } else if (e.type === "servings") {
      o.factorAfter = e.factor;
      o.changes.push(`Scaled ×${Math.round(e.factor * 100) / 100}`);
    } else if (e.type === "preference") o.remembered.push(e.text);
    else if (e.type === "error") refused = true;
  };

  const messages: BetaMessage[] = [];
  const toolResults: { output: string; isError: boolean }[] = [];
  const controller = new AbortController();
  const started = Date.now();
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      runAgent(req, emit, controller.signal, {
        onMessage: (m) => messages.push(m),
        onToolResult: (_name, _input, output, isError) => toolResults.push({ output, isError }),
      }),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new HarnessError("timeout", `no result after ${TIMEOUT_MS / 1000}s`));
        }, TIMEOUT_MS);
      }),
    ]);
  } catch (e) {
    throw e instanceof HarnessError ? e : new HarnessError("api", e instanceof Error ? e.message : String(e));
  } finally {
    clearTimeout(timer);
  }
  const latency = (Date.now() - started) / 1000;

  const usage = zeroUsage();
  let fellBack = false;
  for (const m of messages) {
    addUsage(usage, m.usage);
    const fallback = m.content.some((b) => b.type === ("fallback" as string));
    fellBack ||= fallback;
    if (m.model !== MODEL && !fallback) throw new HarnessError("model_mismatch", `served by ${m.model}, expected ${MODEL}`);
  }
  if (messages.length === 0) throw new HarnessError("api", "no model response recorded");
  const last = messages[messages.length - 1];
  for (const m of messages) {
    if (m.stop_reason === "tool_use") o.preToolNotes.push(m.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join(""));
  }

  const programmatic = gradeProgrammatic(c, o);
  let sound, human;
  try {
    [sound, human] = await Promise.all([judge("sound", c, o), judge("human", c, o)]);
  } catch (e) {
    throw new HarnessError("grader", e instanceof Error ? e.message : String(e));
  }
  const judgeUsage = zeroUsage();
  addUsage(judgeUsage, sound.usage);
  addUsage(judgeUsage, human.usage);

  // Transcript in the report's Turn shape.
  const trace: Turn[] = [{ role: "system", content: SYSTEM }];
  const sent = toMessages(req);
  for (const m of sent) {
    const content = typeof m.content === "string" ? m.content : m.content.map((b) => ("text" in b ? b.text : "")).join("\n\n");
    trace.push({ role: m.role as Turn["role"], content });
  }
  const pending = [...toolResults];
  for (const m of messages) {
    let thinking = "";
    for (const b of m.content) {
      if (b.type === "thinking" && b.thinking) thinking += b.thinking;
      else if (b.type === "text" && b.text.trim()) {
        trace.push({ role: "assistant", content: b.text, ...(thinking && { thinking }) });
        thinking = "";
      } else if (b.type === "tool_use") {
        trace.push({ role: "tool_call", name: b.name, content: JSON.stringify(b.input, null, 2), ...(thinking && { thinking }) });
        thinking = "";
        const r = pending.shift();
        if (r) trace.push({ role: "tool_result", name: b.name, content: (r.isError ? "ERROR: " : "") + r.output });
      }
    }
  }

  return {
    row: {
      prompt_id: c.id,
      prompt: c.message,
      tags: c.tags,
      status: last.stop_reason === "max_tokens" ? "truncated" : "ok",
      stop_reason: last.stop_reason,
      grade: { correct: programmatic.correct, sound: sound.pass, style: programmatic.style, human: human.pass },
      explanation: { ...programmatic.explanation, sound: sound.reason, human: human.reason },
      model: last.model,
      usage,
      judge_model: sound.model,
      judge_usage: judgeUsage,
      latency_s: Math.round(latency * 10) / 10,
      tool_calls: toolResults.length,
      reply_words: o.reply.split(/\s+/).filter(Boolean).length,
      meta: { recipe: c.recipe, reply: o.reply, changes: o.changes, remembered: o.remembered, factor: o.factorAfter, refused, fell_back: fellBack },
    },
    trace,
  };
}

async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(size, queue.length) }, async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) await fn(item);
  }));
}

function wilson(k: number, n: number) {
  if (n === 0) return [0, 0];
  const z = 1.96, p = k / n;
  const d = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / d;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [centre - half, centre + half];
}

async function main() {
  if (args.selftest) return selftest();
  fs.mkdirSync(path.join(OUT, "traces"), { recursive: true });
  const resultsPath = path.join(OUT, "results.jsonl");
  const errorsPath = path.join(OUT, "errors.jsonl");
  const done = new Set(
    fs.existsSync(resultsPath)
      ? fs.readFileSync(resultsPath, "utf8").split("\n").filter(Boolean).map((l) => { const r = JSON.parse(l); return `${r.prompt_id}#${r.rep}`; })
      : [],
  );
  const only = args.only?.split(",");
  const cases = [...CASES].filter((c) => !only || only.includes(c.id)).sort((a, b) => a.id.localeCompare(b.id));
  const jobs = cases.flatMap((c) => Array.from({ length: REPS }, (_, rep) => ({ c, rep }))).filter(({ c, rep }) => !done.has(`${c.id}#${rep}`));
  console.log(`${jobs.length} runs (${cases.length} cases × ${REPS} reps, ${done.size} already done) on ${MODEL}, judged by ${JUDGE_MODEL}`);

  const started = Date.now();
  await pool(jobs, Number(args.concurrency), async ({ c, rep }) => {
    try {
      const { row, trace } = await runCase(c);
      fs.writeFileSync(path.join(OUT, "traces", `${c.id}_rep${rep}.json`), JSON.stringify(trace, null, 2));
      fs.appendFileSync(resultsPath, JSON.stringify({ ...row, rep }) + "\n");
      const g = row.grade;
      console.log(`${c.id} #${rep}  correct ${g.correct}  sound ${g.sound}  style ${g.style}  human ${g.human}  (${row.latency_s}s)`);
    } catch (e) {
      const cls = e instanceof HarnessError ? e.cls : "harness";
      fs.appendFileSync(errorsPath, JSON.stringify({ prompt_id: c.id, rep, class: cls, message: e instanceof Error ? e.message : String(e), at: new Date().toISOString() }) + "\n");
      console.log(`${c.id} #${rep}  ERROR ${cls}: ${e instanceof Error ? e.message : e}`);
    }
  });
  summarize(resultsPath, (Date.now() - started) / 1000);
}

function summarize(resultsPath: string, wall: number) {
  const rows = fs.readFileSync(resultsPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.status === "ok");
  console.log(`\n${rows.length} scored runs`);
  for (const m of ["correct", "sound", "style", "human"]) {
    const k = rows.filter((r) => r.grade[m] === 1).length;
    const [lo, hi] = wilson(k, rows.length);
    console.log(`  ${m.padEnd(8)} ${((100 * k) / rows.length).toFixed(0).padStart(3)}%  (${k}/${rows.length}, 95% CI ${(lo * 100).toFixed(0)}–${(hi * 100).toFixed(0)}%)`);
  }
  const costs = rows.map((r) => cost(r.model, r.usage) + cost(r.judge_model, r.judge_usage)).sort((a, b) => a - b);
  const total = costs.reduce((a, b) => a + b, 0);
  console.log(`  cost     $${total.toFixed(2)} total, $${costs[Math.floor(costs.length / 2)]?.toFixed(3)} median per run (min $${costs[0]?.toFixed(3)}, max $${costs.at(-1)?.toFixed(3)})`);
  console.log(`  time     ${wall.toFixed(0)}s wall-clock this invocation`);
}

/** The graders must fail empty, evasive and confidently wrong answers. */
async function selftest() {
  const probes: [string, (c: Case, before: Recipe) => Outcome][] = [
    ["empty reply, nothing done", (c, before) => ({ before, after: before, factorBefore: 1, factorAfter: 1, reply: "", changes: [], remembered: [], preToolNotes: [] })],
    ["I don't know", (c, before) => ({ before, after: before, factorBefore: 1, factorAfter: 1, reply: "I don't know.", changes: [], remembered: [], preToolNotes: [] })],
    ["confident answer to the wrong question", (c, before) => ({ before, after: before, factorBefore: 1, factorAfter: 1, reply: "Pasta should be cooked in plenty of salted water, about 10 g of salt per litre, so it seasons evenly.", changes: [], remembered: [], preToolNotes: [] })],
  ];
  const ids = ["cookies-out-of-eggs", "curry-shellfish-allergy", "chicken-dinner-timing"];
  let bad = 0;
  for (const id of ids) {
    const c = CASES.find((x) => x.id === id)!;
    const before = startingRecipe(c);
    for (const [label, make] of probes) {
      const o = make(c, before);
      const p = gradeProgrammatic(c, o);
      const [s, h] = await Promise.all([judge("sound", c, o), judge("human", c, o)]);
      const passed = [p.correct && c.checks.unchanged === undefined ? "correct" : "", s.pass ? "sound" : "", h.pass ? "human" : ""].filter(Boolean);
      if (passed.length) bad++;
      console.log(`${id} / ${label}: ${passed.length ? `PASSED ${passed.join(", ")} (should fail)` : "failed everything, as it should"}`);
    }
  }
  console.log(bad ? `\n${bad} probe(s) passed a grader that should have failed them.` : "\nAll graders reject empty, evasive and wrong answers.");
  process.exitCode = bad ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
