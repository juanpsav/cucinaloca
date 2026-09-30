"use client";

import { Check, ChevronLeft, Coffee, ChevronRight, Clock, ExternalLink, LoaderCircle, Minus, Plus, RotateCcw, Sparkles, Timer, Undo2, X } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { Logo } from "@/components/Logo";
import { SaveToMela } from "@/components/SaveToMela";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { SessionUpdater } from "@/hooks/useChat";
import { formatClock, useTimers } from "@/hooks/useTimers";
import { useWakeLock } from "@/hooks/useWakeLock";
import type { CookSession } from "@/lib/client/session";
import { diffList, type DiffStatus } from "@/lib/recipe/diff";
import { formatAmount, renderTemplate } from "@/lib/recipe/scale";
import type { Ingredient, Recipe, Step } from "@/lib/recipe/types";

export type EnrichState = "running" | "done" | "failed";

export function CookView({ session, update, enrichState }: { session: CookSession; update: SessionUpdater; enrichState: EnrichState }) {
  const { recipe, base, factor, checked, current } = session;
  const wake = useWakeLock();
  const timers = useTimers();
  const [chatOpen, setChatOpen] = useState(false);
  const byId = useMemo(() => new Map(recipe.ingredients.map((i) => [i.id, i])), [recipe.ingredients]);
  const stepRefs = useRef(new Map<string, HTMLElement>());
  const currentIndex = recipe.steps.findIndex((s) => s.id === current);
  const ingredients = useMemo(() => diffList(recipe.ingredients, base?.ingredients ?? null), [recipe.ingredients, base]);
  const steps = useMemo(() => diffList(recipe.steps, base?.steps ?? null), [recipe.steps, base]);
  const edited = [...ingredients, ...steps].some((d) => d.status !== "same");

  const set = (patch: Partial<CookSession>) => update((s) => ({ ...s, ...patch }));
  const goTo = (index: number) => {
    const step = recipe.steps[Math.max(0, Math.min(recipe.steps.length - 1, index))];
    set({ current: step.id });
  };
  const resetChanges = () =>
    update((s) =>
      s.base
        ? {
            ...s,
            recipe: s.base,
            chat: s.chat.map((m) => ({ ...m, changes: m.changes.map((c) => ({ ...c, undone: true })) })),
            earlierChanges: [],
          }
        : s,
    );

  useEffect(() => {
    if (current) stepRefs.current.get(current)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [current]);

  let stepNumber = 0;
  return (
    <div className={`pb-40 transition-[padding] duration-300 ${chatOpen ? "lg:pr-[400px]" : ""}`}>
      <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Logo className="text-xl" />
          <div className="flex items-center gap-1">
            <SaveToMela session={session} />
            <ThemeToggle />
            {wake.supported && (
              <button
                onClick={wake.toggle}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition ${wake.active ? "bg-accent-soft text-accent" : "text-muted hover:text-ink"}`}
                title="Keep the screen on while you cook"
              >
                <Coffee className="size-4" />
                <span className="hidden sm:inline">{wake.active ? "Screen stays on" : "Keep screen on"}</span>
              </button>
            )}
            {recipe.meta.url && (
              <a href={recipe.meta.url} target="_blank" rel="noreferrer" className="rounded-full p-2 text-muted hover:text-ink" title="Original recipe">
                <ExternalLink className="size-4" />
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4">
        <TitleBlock recipe={recipe} />

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Servings recipe={recipe} factor={factor} onFactor={(f) => set({ factor: f })} />
          <EnrichBadge state={enrichState} />
          {edited && (
            <button onClick={resetChanges} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-surface hover:text-ink">
              <Undo2 className="size-4" />
              Back to the original
            </button>
          )}
        </div>

        <div className="mt-8 grid gap-10 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)] md:gap-12">
          <section aria-labelledby="ingredients" className="md:sticky md:top-20 md:self-start md:max-h-[calc(100dvh-6rem)] md:overflow-y-auto md:pr-2">
            <SectionTitle id="ingredients">Ingredients</SectionTitle>
            <ul className="mt-3">
              {ingredients.map(({ item: ing, status, before }, i) => {
                const prevGroup = ingredients[i - 1]?.item.group;
                const heading = ing.group && ing.group !== prevGroup ? <GroupLabel>{ing.group}</GroupLabel> : null;
                if (status === "removed") {
                  return (
                    <Fragment key={`removed-${ing.id}`}>
                      {heading}
                      <li className="flex items-start gap-3 px-2 py-2 text-sm text-muted">
                        <span className="mt-0.5 size-5 shrink-0" />
                        <span className="line-through decoration-muted/60">
                          <Amounts text={ing.text} template={ing.template} factor={factor} plain />
                        </span>
                      </li>
                    </Fragment>
                  );
                }
                const done = checked.includes(ing.id);
                const inStep = currentIndex >= 0 && recipe.steps[currentIndex].ingredientIds.includes(ing.id);
                return (
                  <Fragment key={ing.id}>
                    {heading}
                    <li>
                      <button
                        onClick={() => set({ checked: done ? checked.filter((c) => c !== ing.id) : [...checked, ing.id] })}
                        className={`flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left transition ${inStep ? "bg-focus" : "hover:bg-surface"} ${changedBar(status)}`}
                      >
                        <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition ${done ? "border-accent bg-accent text-paper" : "border-line"}`}>
                          {done && <Check className="size-3" strokeWidth={3} />}
                        </span>
                        <span className="leading-snug">
                          <span className={done ? "text-muted line-through decoration-muted/60" : ""}>
                            <Amounts text={ing.text} template={ing.template} factor={factor} />
                          </span>
                          {before && (
                            <span className="mt-0.5 block text-sm text-muted line-through decoration-muted/60">
                              <Amounts text={before.text} template={before.template} factor={factor} plain />
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  </Fragment>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="steps">
            <SectionTitle id="steps">Steps</SectionTitle>
            <ol className="mt-3 space-y-3">
              {steps.map(({ item: step, status, before }, i) => {
                const prevGroup = steps[i - 1]?.item.group;
                const heading = step.group && step.group !== prevGroup ? <GroupLabel>{step.group}</GroupLabel> : null;
                if (status === "removed") {
                  return (
                    <Fragment key={`removed-${step.id}`}>
                      {heading}
                      <li className="flex gap-4 px-4 py-2 text-sm text-muted">
                        <span className="size-8 shrink-0" />
                        <span className="line-through decoration-muted/60">{step.text}</span>
                      </li>
                    </Fragment>
                  );
                }
                const number = stepNumber++;
                return (
                  <Fragment key={step.id}>
                    {heading}
                    <StepCard
                      ref={(el) => {
                        if (el) stepRefs.current.set(step.id, el);
                      }}
                      step={step}
                      index={number}
                      status={status}
                      before={before}
                      isCurrent={step.id === current}
                      dimmed={current !== null && step.id !== current}
                      ingredients={step.ingredientIds.map((id) => byId.get(id)!).filter(Boolean)}
                      factor={factor}
                      onSelect={() => set({ current: step.id === current ? null : step.id })}
                      onTimer={(label, seconds) => timers.start(label, seconds)}
                    />
                  </Fragment>
                );
              })}
            </ol>
          </section>
        </div>
      </main>

      <BottomBar
        timers={timers}
        stepLabel={currentIndex >= 0 ? `Step ${currentIndex + 1} of ${recipe.steps.length}` : `${recipe.steps.length} steps`}
        stepShort={currentIndex >= 0 ? `${currentIndex + 1}/${recipe.steps.length}` : `${recipe.steps.length} steps`}
        onPrev={() => goTo(currentIndex <= 0 ? 0 : currentIndex - 1)}
        onNext={() => goTo(currentIndex + 1)}
        canPrev={currentIndex > 0}
        canNext={currentIndex < recipe.steps.length - 1}
        onAsk={() => setChatOpen(true)}
        chatOpen={chatOpen}
      />
      <ChatPanel session={session} update={update} open={chatOpen} onClose={() => setChatOpen(false)} disabled={enrichState === "running"} />
    </div>
  );
}

function changedBar(status: DiffStatus) {
  return status === "changed" || status === "added" ? "shadow-[inset_3px_0_0_var(--accent)]" : "";
}

function TitleBlock({ recipe }: { recipe: Recipe }) {
  const byline = [recipe.meta.siteName, recipe.meta.author].filter(Boolean).join(" · ");
  const times = [
    ["Prep", recipe.times.prep],
    ["Cook", recipe.times.cook],
    ["Total", recipe.times.total],
  ].filter((t): t is [string, number] => t[1] != null);
  return (
    <div className="pt-8">
      {byline && <p className="text-sm text-muted">{byline}</p>}
      <h1 className="mt-1 font-serif text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">{recipe.title}</h1>
      {recipe.description && <p className="mt-3 max-w-2xl text-muted line-clamp-3">{recipe.description}</p>}
      {times.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {times.map(([label, min]) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5 text-muted" />
              <span className="text-muted">{label}</span> {duration(min)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Servings({ recipe, factor, onFactor }: { recipe: Recipe; factor: number; onFactor: (f: number) => void }) {
  const base = recipe.servings.amount;
  const canScale = recipe.enriched;
  const step = base ? Math.max(1, Math.round(base / 4)) : 0.5;
  const value = base ? base * factor : factor;
  const next = (dir: 1 | -1) => {
    const v = Math.max(step, value + dir * step);
    onFactor(base ? v / base : v);
  };
  const label = base ? `${formatAmount(value)} ${recipe.servings.label}` : `×${formatAmount(value)}`;

  if (!canScale) {
    return recipe.servings.text ? <span className="rounded-full border border-line px-3 py-1.5 text-sm">{recipe.servings.text}</span> : null;
  }
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-line bg-surface p-1">
      <button onClick={() => next(-1)} className="grid size-8 place-items-center rounded-full hover:bg-paper" aria-label="Fewer">
        <Minus className="size-4" />
      </button>
      <span className="min-w-24 text-center text-sm font-medium tabular-nums">{label}</span>
      <button onClick={() => next(1)} className="grid size-8 place-items-center rounded-full hover:bg-paper" aria-label="More">
        <Plus className="size-4" />
      </button>
      {factor !== 1 && (
        <button onClick={() => onFactor(1)} className="grid size-8 place-items-center rounded-full text-muted hover:bg-paper hover:text-ink" aria-label="Reset">
          <RotateCcw className="size-3.5" />
        </button>
      )}
    </div>
  );
}

function EnrichBadge({ state }: { state: EnrichState }) {
  if (state === "running") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted">
        <LoaderCircle className="size-4 animate-spin" />
        Setting up scaling and timers…
      </span>
    );
  }
  if (state === "failed") return <span className="text-sm text-muted">Scaling and timers aren&apos;t available for this one.</span>;
  return null;
}

function StepCard({
  ref,
  step,
  index,
  status,
  before,
  isCurrent,
  dimmed,
  ingredients,
  factor,
  onSelect,
  onTimer,
}: {
  ref: (el: HTMLLIElement | null) => void;
  step: Step;
  index: number;
  status: DiffStatus;
  before?: Step;
  isCurrent: boolean;
  dimmed: boolean;
  ingredients: Ingredient[];
  factor: number;
  onSelect: () => void;
  onTimer: (label: string, seconds: number) => void;
}) {
  return (
    <li
      ref={ref}
      className={`scroll-mt-24 rounded-2xl border transition ${isCurrent ? "border-accent/40 bg-surface shadow-sm" : "border-transparent"} ${dimmed ? "opacity-55" : ""} ${changedBar(status)}`}
    >
      <button onClick={onSelect} className="flex w-full gap-4 p-4 text-left">
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-full font-serif text-sm font-semibold ${isCurrent ? "bg-accent text-paper" : "bg-surface text-muted ring-1 ring-line"}`}
        >
          {index + 1}
        </span>
        <span className={`leading-relaxed ${isCurrent ? "text-lg" : ""}`}>
          <Amounts text={step.text} template={step.template} factor={factor} />
          {before && (
            <span className="mt-1 block text-sm text-muted line-through decoration-muted/60">
              <Amounts text={before.text} template={before.template} factor={factor} plain />
            </span>
          )}
        </span>
      </button>

      {(step.timers.length > 0 || (isCurrent && ingredients.length > 0)) && (
        <div className="space-y-3 px-4 pb-4 pl-16">
          {isCurrent && ingredients.length > 0 && (
            <ul className="space-y-1 rounded-xl bg-focus px-3 py-2 text-sm">
              {ingredients.map((ing) => (
                <li key={ing.id}>
                  <Amounts text={ing.text} template={ing.template} factor={factor} />
                </li>
              ))}
            </ul>
          )}
          {step.timers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {step.timers.map((t, i) => (
                <button
                  key={i}
                  onClick={() => onTimer(t.label, t.seconds)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent transition hover:brightness-95"
                >
                  <Timer className="size-4" />
                  {t.label} · {duration(t.seconds / 60)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function BottomBar({
  timers,
  stepLabel,
  stepShort,
  onPrev,
  onNext,
  canPrev,
  canNext,
  onAsk,
  chatOpen,
}: {
  timers: ReturnType<typeof useTimers>;
  stepLabel: string;
  stepShort: string;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  onAsk: () => void;
  chatOpen: boolean;
}) {
  return (
    <div className={`fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)] transition-[right] duration-300 ${chatOpen ? "lg:right-[400px]" : ""}`}>
      <div className="mx-auto max-w-6xl space-y-2 px-4 pb-3">
        {timers.timers.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2">
            {timers.timers.map((t) => {
              const done = t.endsAt <= timers.now;
              return (
              <div
                key={t.id}
                className={`inline-flex items-center gap-2 rounded-full py-1.5 pr-1.5 pl-3 text-sm font-medium shadow-lg ${done ? "bg-accent text-paper" : "bg-ink text-paper"}`}
              >
                <Timer className={`size-4 ${done ? "animate-[ring_0.8s_ease-in-out_infinite]" : ""}`} />
                <span>{t.label}</span>
                <span className="tabular-nums opacity-80">{done ? "Done" : formatClock(t.endsAt - timers.now)}</span>
                <button onClick={() => timers.dismiss(t.id)} className="grid size-6 place-items-center rounded-full bg-paper/15" aria-label="Dismiss timer">
                  <X className="size-3.5" />
                </button>
              </div>
              );
            })}
          </div>
        )}
        <div className="flex items-center justify-center gap-2">
        <div className="flex w-fit items-center gap-1 rounded-full border border-line bg-surface/95 p-1 shadow-lg backdrop-blur">
          <button onClick={onPrev} disabled={!canPrev} className="grid size-9 place-items-center rounded-full hover:bg-paper disabled:opacity-30 sm:size-10" aria-label="Previous step">
            <ChevronLeft className="size-5" />
          </button>
          <span className="min-w-14 text-center text-sm font-medium tabular-nums sm:min-w-32">
            <span className="sm:hidden">{stepShort}</span>
            <span className="hidden sm:inline">{stepLabel}</span>
          </span>
          <button onClick={onNext} disabled={!canNext} className="grid size-9 place-items-center rounded-full hover:bg-paper disabled:opacity-30 sm:size-10" aria-label="Next step">
            <ChevronRight className="size-5" />
          </button>
        </div>
        {!chatOpen && (
          <button
            onClick={onAsk}
            className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-accent pr-5 pl-4 font-medium whitespace-nowrap text-paper shadow-lg transition hover:brightness-105"
          >
            <Sparkles className="size-4" />
            Ask your sous-chef
          </button>
        )}
        </div>
      </div>
    </div>
  );
}

function Amounts({ text, template, factor, plain = false }: { text: string; template: string | null; factor: number; plain?: boolean }) {
  if (!template) return <>{text}</>;
  if (plain) return <>{renderTemplate(template, factor).map((s) => s.text).join("")}</>;
  return (
    <>
      {renderTemplate(template, factor).map((seg, i) =>
        seg.amount ? (
          <strong key={i} className={`font-semibold ${factor !== 1 ? "text-accent" : ""}`}>
            {seg.text}
          </strong>
        ) : (
          <Fragment key={i}>{seg.text}</Fragment>
        ),
      )}
    </>
  );
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">
      {children}
    </h2>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <li className="px-2 pt-4 pb-1 font-serif text-base font-semibold">{children}</li>;
}

function duration(minutes: number): string {
  if (minutes < 1) return `${Math.round(minutes * 60)} sec`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
}
