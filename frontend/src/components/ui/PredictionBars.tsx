type Item = { label: string; p: number };

/** Horizontal probability bars (top-3 in lessons, top-24 in the AI Lab). Every bar has its % as text; the most likely letter is highlighted. */
export function PredictionBars({ items, caption }: { items: readonly Item[]; caption: string }) {
  const top = items.reduce<Item | null>((best, it) => (!best || it.p > best.p ? it : best), null)?.label;
  return (
    <ul aria-label={caption} className="flex flex-col gap-2.5">
      {items.map(({ label, p }) => {
        const pct = Math.round(Math.max(0, Math.min(1, p)) * 100);
        return (
          <li key={label} data-top={label === top ? 'true' : undefined} className="flex items-center gap-3">
            <span className={`flex size-8 shrink-0 items-center justify-center rounded-xl text-base font-extrabold ${label === top ? 'bg-brand-100 text-brand-fg' : 'bg-surface-2 text-text-muted'}`}>
              {label}
            </span>
            <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
              <div
                className={`h-full rounded-full transition-[width] duration-(--motion-base) ease-out ${label === top ? 'progress-fill' : 'bg-brand-200'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-11 text-right text-sm font-extrabold tabular-nums text-text-muted">{pct}%</span>
          </li>
        );
      })}
    </ul>
  );
}
