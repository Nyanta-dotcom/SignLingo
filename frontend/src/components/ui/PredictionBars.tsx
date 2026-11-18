type Item = { label: string; p: number };

/** Horizontal probability bars (top-3 in lessons, top-24 in the AI Lab). Every bar has its % as text. */
export function PredictionBars({ items, caption }: { items: readonly Item[]; caption: string }) {
  return (
    <ul aria-label={caption} className="flex flex-col gap-2">
      {items.map(({ label, p }, i) => {
        const pct = Math.round(Math.max(0, Math.min(1, p)) * 100);
        return (
          <li key={label} className="flex items-center gap-3">
            <span className="w-6 text-lg font-extrabold">{label}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
              <div className={`h-full rounded-full ${i === 0 ? 'bg-brand-500' : 'bg-brand-200'}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="w-12 text-right tabular-nums">{pct}%</span>
          </li>
        );
      })}
    </ul>
  );
}
