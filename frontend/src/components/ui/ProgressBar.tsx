type Props = { value: number; max?: number; label: string; className?: string };

/** Glossy Duolingo-style progress bar: role=progressbar, 16 px thick, full pill radius. */
export function ProgressBar({ value, max = 100, label, className = '' }: Props) {
  const clamped = Math.max(0, Math.min(max, value));
  const pct = max > 0 ? (clamped / max) * 100 : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={clamped}
      className={`h-4 w-full overflow-hidden rounded-full border border-border bg-surface-2 p-0.5 ${className}`}
    >
      <div
        className={`progress-fill relative h-full rounded-full transition-[width] duration-(--motion-base) ${pct > 0 ? 'min-w-3' : ''}`}
        style={{ width: `${pct}%` }}
      >
        <span aria-hidden="true" className="absolute inset-x-2 top-0.5 h-1 rounded-full bg-surface/45" />
      </div>
    </div>
  );
}
