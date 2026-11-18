import { vi } from '@/i18n/vi';
import type { LessonStatus } from '@/game/unlock';

const STYLE: Record<LessonStatus, string> = {
  locked: 'border-border bg-surface-2 text-text-muted',
  available: 'border-brand-500 bg-brand-600 text-text-on-brand shadow-[0_4px_0_var(--brand-700)]',
  in_progress: 'border-warning-fg bg-surface text-warning-fg shadow-[0_4px_0_var(--border)]',
  completed: 'border-success-fg bg-success-bg text-success-fg shadow-[0_4px_0_var(--border)]',
};

/** One lesson on the path. The status is always spelled out in the accessible name, never only by colour. */
export function SkillNode({ title, status, expanded, onSelect }: {
  title: string; status: LessonStatus; expanded: boolean; onSelect: () => void;
}) {
  const locked = status === 'locked';
  return (
    <button
      type="button" aria-label={vi.learn.node(title, vi.learn.status[status])} aria-expanded={expanded}
      data-status={status} onClick={onSelect}
      className={`flex size-16 flex-col items-center justify-center rounded-full border-4 text-lg font-extrabold ${STYLE[status]} ${locked ? 'cursor-not-allowed' : ''} focus-visible:outline-3 focus-visible:outline-focus-ring`}
    >
      <span aria-hidden="true">{vi.learn.icon[status]}</span>
    </button>
  );
}
