import { vi } from '@/i18n/vi';

const KINDS = {
  streak: { icon: '🔥', color: 'text-streak', label: vi.stats.streak },
  xp: { icon: '⚡', color: 'text-xp', label: vi.stats.xp },
  hearts: { icon: '❤', color: 'text-heart', label: vi.stats.hearts },
} as const;

/** Streak / XP / hearts chip for the top bar. The icon is decorative; the label carries the meaning (docs/05 D2). */
export function StatChip({ kind, value }: { kind: keyof typeof KINDS; value: number }) {
  const k = KINDS[kind];
  return (
    <span title={k.label} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 font-extrabold tabular-nums">
      <span aria-hidden="true" className={k.color}>{k.icon}</span>
      <span>{value}</span>
      <span className="sr-only">{k.label}</span>
    </span>
  );
}
