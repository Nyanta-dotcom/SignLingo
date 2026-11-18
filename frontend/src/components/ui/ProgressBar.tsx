type Props = { value: number; max?: number; label: string; className?: string };

/** Lesson progress bar (docs/05 §3): role=progressbar, 16 px thick, full radius. */
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
      className={`h-4 w-full overflow-hidden rounded-full bg-surface-2 ${className}`}
    >
      <div className="h-full rounded-full bg-brand-500 transition-[width] duration-(--motion-base)" style={{ width: `${pct}%` }} />
    </div>
  );
}
