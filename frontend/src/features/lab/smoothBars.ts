/** Display-only smoothing for the AI Lab probability bars: each update moves `alpha` of the way toward the new value,
 *  so frame-to-frame noise does not make the bars jump. The engine's own decisions are not affected. */
export function smoothBars(prev: Readonly<Record<string, number>>, next: ReadonlyArray<{ label: string; p: number }>, alpha = 0.35): Record<string, number> {
  const out: Record<string, number> = {};
  for (const { label, p } of next) {
    const before = prev[label];
    out[label] = before === undefined ? p : before + alpha * (p - before);
  }
  return out;
}
