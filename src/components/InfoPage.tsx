import { Logo } from "@/components/Logo";

export function InfoPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 pt-8 pb-24">
      <Logo />
      <p className="mt-12 text-sm font-medium tracking-[0.14em] text-muted uppercase">{eyebrow}</p>
      <h1 className="mt-2 font-serif text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">{title}</h1>
      <p className="mt-4 text-lg text-muted">{intro}</p>
      <div className="mt-10 space-y-10">{children}</div>
    </main>
  );
}

export function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="space-y-5 [counter-reset:step]">{children}</ol>;
}

export function StepItem({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <li className="flex gap-4 [counter-increment:step]">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent font-serif text-sm font-semibold text-paper before:content-[counter(step)]" />
      <div className="pt-1">
        <p className="font-medium">{title}</p>
        {children && <div className="mt-1 space-y-2 text-muted">{children}</div>}
      </div>
    </li>
  );
}

export function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded-md bg-surface px-1.5 py-0.5 text-[0.9em] break-all text-ink ring-1 ring-line">{children}</code>;
}
