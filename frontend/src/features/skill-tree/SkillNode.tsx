import type { ComponentType, SVGProps } from 'react';
import { LockIcon, PlayIcon, SparkleIcon, StarIcon } from '@/components/ui/Icons';
import { vi } from '@/i18n/vi';
import type { LessonStatus } from '@/game/unlock';

const STYLE: Record<LessonStatus, string> = {
  locked: 'border-border bg-surface-2 text-text-muted shadow-[0_4px_0_var(--border)]',
  available: 'node-available node-halo border-surface text-ink-on-pink hover:-translate-y-0.5',
  in_progress: 'border-warning-fg bg-warning-bg text-warning-fg shadow-[0_4px_0_var(--border-strong)] hover:-translate-y-0.5',
  completed: 'border-success-fg bg-success-bg text-success-fg shadow-[0_4px_0_var(--border)] hover:-translate-y-0.5',
};

const ICON: Record<LessonStatus, ComponentType<SVGProps<SVGSVGElement>>> = {
  locked: LockIcon,
  available: PlayIcon,
  in_progress: SparkleIcon,
  completed: StarIcon,
};

/** One lesson on the path. The status is always spelled out in the accessible name, never only by colour. */
export function SkillNode({ title, status, expanded, onSelect }: {
  title: string; status: LessonStatus; expanded: boolean; onSelect: () => void;
}) {
  const locked = status === 'locked';
  const Icon = ICON[status];
  return (
    <button
      type="button"
      aria-label={vi.learn.node(title, vi.learn.status[status])}
      aria-expanded={expanded}
      data-status={status}
      onClick={onSelect}
      className={`flex size-[4.5rem] cursor-pointer items-center justify-center rounded-full border-4 transition-[transform,box-shadow] duration-(--motion-fast) active:translate-y-1 active:shadow-none ${STYLE[status]} ${locked ? 'cursor-not-allowed active:translate-y-0' : ''}`}
    >
      <Icon className="size-7" />
    </button>
  );
}
