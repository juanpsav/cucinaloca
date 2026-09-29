export type DiffStatus = "same" | "changed" | "added" | "removed";
export type Diffed<T> = { item: T; status: DiffStatus; before?: T };

/**
 * The current list, annotated against the original. Removed originals are kept in place
 * (after the nearest earlier original that survived) so the cook sees what went away.
 */
export function diffList<T extends { id: string; text: string }>(current: T[], base: T[] | null): Diffed<T>[] {
  if (!base) return current.map((item) => ({ item, status: "same" }));
  const baseById = new Map(base.map((b) => [b.id, b]));
  const out: Diffed<T>[] = current.map((item) => {
    const before = baseById.get(item.id);
    if (!before) return { item, status: "added" };
    return before.text === item.text ? { item, status: "same" } : { item, status: "changed", before };
  });

  const currentIds = new Set(current.map((c) => c.id));
  base.forEach((b, k) => {
    if (currentIds.has(b.id)) return;
    let at = 0;
    for (let j = k - 1; j >= 0; j--) {
      const pos = out.findIndex((d) => d.item.id === base[j].id);
      if (pos >= 0) {
        at = pos + 1;
        break;
      }
    }
    while (at < out.length && out[at].status === "removed") at++;
    out.splice(at, 0, { item: b, status: "removed" });
  });
  return out;
}
