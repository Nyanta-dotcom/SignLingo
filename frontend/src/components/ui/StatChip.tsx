import type { ComponentType, SVGProps } from 'react';
import { vi } from '@/i18n/vi';
import { BoltIcon, FlameIcon, HeartIcon } from './Icons';

type KindMeta = {
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  color: string;
  bg: string;
  label: string;
};

const KINDS: Record<'streak' | 'xp' | 'hearts', KindMeta> = {
  streak: { Icon: FlameIcon, color: 'text-streak', bg: 'bg-warning-bg/60', label: vi.stats.streak },
  xp: { Icon: BoltIcon, color: 'text-xp', bg: 'bg-warning-bg/50', label: vi.stats.xp },
  hearts: { Icon: HeartIcon, color: 'text-heart', bg: 'bg-brand-50', label: vi.stats.hearts },
};

/** Streak / XP / hearts pill chip for the top bar. The icon is decorative; the label carries the meaning. */
export function StatChip({ kind, value }: { kind: keyof typeof KINDS; value: number }) {
  const { Icon, color, bg, label } = KINDS[kind];
  return (
    <span
      title={label}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-full border-2 border-border bg-surface px-3 py-1 text-sm font-extrabold tabular-nums text-text shadow-[0_2px_0_var(--border)]"
    >
      <span className={`inline-flex size-6 items-center justify-center rounded-full ${bg} ${color}`}>
        <Icon className="size-4" />
      </span>
      <span>{value}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
