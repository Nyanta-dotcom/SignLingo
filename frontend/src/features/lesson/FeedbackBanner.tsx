import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { vi } from '@/i18n/vi';

export type Feedback = { kind: 'correct' | 'wrong' | 'skipped'; letter: string; heartLost: boolean };

const TONE = {
  correct: 'border-success-fg/30 bg-success-bg text-success-fg',
  wrong: 'border-danger-fg/30 bg-danger-bg text-danger-on-bg',
  skipped: 'border-border bg-surface-2 text-text',
} as const;

/** Slides in after each sign. The text always says what happened; colour is only a second cue. */
export function FeedbackBanner({ feedback, onContinue }: { feedback: Feedback; onContinue: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => root.current?.querySelector('button')?.focus(), []);
  const text = feedback.kind === 'correct' ? vi.lesson.correct : feedback.kind === 'wrong' ? vi.lesson.wrong(feedback.letter) : vi.lesson.skipped;
  return (
    <div ref={root} role="status" data-kind={feedback.kind} className={`flex flex-wrap items-center gap-4 rounded-3xl border-2 p-5 shadow-(--card-shadow) ${TONE[feedback.kind]}`}>
      <p className="flex-1 text-lg font-extrabold">
        <span aria-hidden="true">{feedback.kind === 'correct' ? '✓ ' : feedback.kind === 'wrong' ? '✗ ' : '→ '}</span>
        {text}
        {feedback.heartLost && <span className="ml-3 text-base"><span aria-hidden="true">💔 </span>{vi.lesson.heartLost}</span>}
      </p>
      <Button onClick={onContinue} variant={feedback.kind === 'correct' ? 'success' : 'primary'}>{vi.lesson.continue}</Button>
    </div>
  );
}
