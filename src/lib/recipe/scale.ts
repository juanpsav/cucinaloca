export type Segment = { text: string; amount?: false } | { text: string; amount: true };

/** A scalable amount in a template: [[1.5]], or [[2|w]] for whole items (eggs, cloves, cans). */
export const MARKER = /\[\[(\d+(?:\.\d+)?)(\|w)?\]\]/g;

/** Split a template into text and scaled, formatted amounts. */
export function renderTemplate(template: string, factor: number): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of template.matchAll(MARKER)) {
    if (m.index > last) out.push({ text: template.slice(last, m.index) });
    out.push({ text: formatMarker(Number(m[1]), !!m[2], factor), amount: true });
    last = m.index + m[0].length;
  }
  if (last < template.length) out.push({ text: template.slice(last) });
  // A range whose ends round to the same number ("1-1 sprigs") becomes a single amount.
  for (let i = out.length - 3; i >= 0; i--) {
    if (out[i].amount && out[i + 2].amount && /^\s*(-|–|to)\s*$/.test(out[i + 1].text) && out[i].text === out[i + 2].text) out.splice(i + 1, 2);
  }
  return out;
}

export function renderText(template: string, factor: number): string {
  return renderTemplate(template, factor)
    .map((s) => s.text)
    .join("");
}

function formatMarker(value: number, whole: boolean, factor: number): string {
  const n = value * factor;
  // At the original size show the author's numbers; only round what we computed.
  if (factor === 1) return n >= 10 ? String(Math.round(n * 100) / 100) : formatAmount(n);
  if (whole) return String(Math.max(1, Math.round(n)));
  return formatAmount(n);
}

/** Rewrite every marker's value, e.g. to convert amounts written at the current scale back to the original. */
export function mapMarkers(template: string, fn: (n: number) => number): string {
  return template.replace(MARKER, (_, n: string, w: string | undefined) => `[[${round(fn(Number(n)))}${w ?? ""}]]`);
}

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

const FRACTIONS: [number, string][] = [
  [0, ""], [1 / 8, "⅛"], [1 / 4, "¼"], [1 / 3, "⅓"], [3 / 8, "⅜"], [1 / 2, "½"],
  [5 / 8, "⅝"], [2 / 3, "⅔"], [3 / 4, "¾"], [7 / 8, "⅞"], [1, ""],
];

/** Kitchen-friendly numbers: fractions for small amounts, whole numbers above 10. */
export function formatAmount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 100) return String(Math.round(n / 5) * 5);
  if (n >= 10) return String(Math.round(n));
  const whole = Math.floor(n);
  const [value, glyph] = FRACTIONS.reduce((best, f) => (Math.abs(n - whole - f[0]) < Math.abs(n - whole - best[0]) ? f : best));
  if (value === 1) return String(whole + 1);
  if (whole === 0) return glyph || "⅛";
  return `${whole}${glyph}`;
}
