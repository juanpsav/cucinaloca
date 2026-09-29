export type Segment = { text: string; amount?: false } | { text: string; amount: true };

/** Split a template into text and scaled, formatted amounts. */
export function renderTemplate(template: string, factor: number): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of template.matchAll(/\[\[([\d.]+)\]\]/g)) {
    if (m.index > last) out.push({ text: template.slice(last, m.index) });
    // At the original size show the author's numbers; only round what we computed.
    const n = Number(m[1]) * factor;
    out.push({ text: factor === 1 && n >= 10 ? String(Math.round(n * 100) / 100) : formatAmount(n), amount: true });
    last = m.index + m[0].length;
  }
  if (last < template.length) out.push({ text: template.slice(last) });
  return out;
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
