import { useEffect, useRef, useState } from 'react';
import type { Lesson } from '@/content/types';
import { toAttempt, type Outcome } from '@/game/lessonFlow';
import type { SessionRecord } from '@/storage/types';
import { useLearner } from '@/storage/useLearner';
import type { Feedback } from './FeedbackBanner';

export type Result = { record: SessionRecord; streakFrom: number };
type Phase = 'item' | 'feedback' | 'done' | 'no_hearts';

/**
 * Walks through a lesson's items and records every attempt in a session. The session is created
 * lazily at the first attempt, so opening a lesson and leaving again leaves no trace. Leaving
 * before the end abandons the session (no XP, no progress).
 */
export function useLessonRun(lesson: Lesson, model: { model_id: string; version: string }) {
  const startSession = useLearner((s) => s.startSession);
  const recordAttempt = useLearner((s) => s.recordAttempt);
  const completeSession = useLearner((s) => s.completeSession);
  const abandonSession = useLearner((s) => s.abandonSession);
  const streak = useLearner((s) => s.stats.current_streak);
  const items = [...lesson.items].sort((a, b) => a.order - b.order);
  const [index, setIndex] = useState(0);
  const [retries, setRetries] = useState(0);
  const [phase, setPhase] = useState<Phase>('item');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const session = useRef<{ id: string; open: boolean; streakFrom: number; heartsLost: number } | null>(null);

  useEffect(() => () => {
    if (session.current?.open) abandonSession(session.current.id);
  }, [abandonSession]);

  /**
   * Records the outcome of the current item and shows feedback (or ends the lesson when out of hearts).
   * For a spelled word, `expected` is the letter attempted, `shown` what the feedback names (the word),
   * and `more` keeps the item open after a verified letter.
   */
  function answer(outcome: Outcome, opts: { expected?: string; shown?: string; more?: boolean } = {}) {
    const item = items[index];
    session.current ??= {
      id: startSession({ mode: 'lesson', lesson_code: lesson.code, model }).id, open: true, streakFrom: streak, heartsLost: 0,
    };
    const run = session.current;
    const attempt = toAttempt(item, outcome, retries, opts.expected);
    const record = recordAttempt(run.id, attempt);
    const heartLost = record.hearts_lost > run.heartsLost;
    run.heartsLost = record.hearts_lost;
    if (record.status === 'failed_no_hearts') {
      run.open = false;
      setPhase('no_hearts');
      return;
    }
    if (opts.more) return;
    const kind = outcome.result === 'correct' ? 'correct' : outcome.result === 'timed_out' ? 'wrong' : 'skipped';
    setFeedback({ kind, letter: opts.shown ?? attempt.expected, heartLost });
    setPhase('feedback');
  }

  /** Lets the learner immediately retry the current item after a wrong attempt. */
  function retry() {
    setFeedback(null);
    setRetries((n) => n + 1);
    setPhase('item');
  }

  /** Leaves the feedback (or a learn card) and moves to the next item, or finishes the lesson. */
  function advance() {
    setFeedback(null);
    setRetries(0);
    if (index + 1 < items.length) {
      setIndex(index + 1);
      setPhase('item');
      return;
    }
    const run = session.current;
    if (run) {
      const record = completeSession(run.id, { xpReward: lesson.xp_reward });
      run.open = false;
      setResult({ record, streakFrom: run.streakFrom });
    } else {
      setResult(null); // a lesson made only of cards has nothing to record
    }
    setPhase('done');
  }

  return { items, index, retries, item: items[index], phase, feedback, result, answer, retry, advance };
}
