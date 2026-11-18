/** Pure helpers for playing a lesson (docs/03 §2-3, docs/05 §5.2). No DOM, no React, no storage. */

import type { Item } from '@/content/types';
import type { Attempt } from '@/storage/types';

/**
 * Seconds a learner gets for one sign before it counts as timed out. HYPOTHESIS (not measured, needs
 * approval): the manifest only recommends threshold and hold time. Override per item with config.time_limit_ms.
 */
export const DEFAULT_TIME_LIMIT_MS = 15_000;

/** Share of items that must be correct for a lesson to count as completed (decided by the team, not measured). */
export const MIN_LESSON_ACCURACY = 0.5;
export const lessonPassed = (accuracy: number) => accuracy >= MIN_LESSON_ACCURACY;

export type Recommended = { threshold: number; hold_ms: number };
export type PerformConfig = { holdMs: number; threshold: number; timeLimitMs: number };

/** Item settings win; otherwise the model manifest's recommendation; the time limit falls back to DEFAULT_TIME_LIMIT_MS. */
export function performConfig(item: Item, rec: Recommended): PerformConfig {
  return {
    holdMs: item.config?.hold_ms ?? rec.hold_ms,
    threshold: item.config?.threshold ?? rec.threshold,
    timeLimitMs: item.config?.time_limit_ms ?? DEFAULT_TIME_LIMIT_MS,
  };
}

export const letterOf = (signCode: string) => signCode.replace(/^LETTER_/, '');

export type Outcome =
  | { result: 'correct'; label: string; confidence: number; timeToVerifyMs: number }
  | { result: 'timed_out'; lastLabel: string | null; lastConfidence: number | null; confusedWith: string | null }
  | { result: 'skipped'; lastLabel: string | null; lastConfidence: number | null };

/** The record stored for one finished item. */
export function toAttempt(item: Item, outcome: Outcome, retries = 0, expectedLetter?: string): Attempt {
  const expected = expectedLetter ?? letterOf(item.sign_code ?? '');
  const base = { item_order: item.order, position: null, expected, retries };
  if (outcome.result === 'correct') {
    return { ...base, predicted: outcome.label, confidence: outcome.confidence, result: 'correct', time_to_verify_ms: outcome.timeToVerifyMs, confused_with: null };
  }
  return {
    ...base, predicted: outcome.lastLabel, confidence: outcome.lastConfidence, result: outcome.result, time_to_verify_ms: null,
    confused_with: outcome.result === 'timed_out' ? outcome.confusedWith : null,
  };
}

/** Letters the learner missed, most misses first (ties by letter), for the "review" list on the result screen. */
export function missedLetters(attempts: readonly Attempt[]): Array<{ letter: string; misses: number }> {
  const counts = new Map<string, number>();
  for (const a of attempts) if (a.result !== 'correct') counts.set(a.expected, (counts.get(a.expected) ?? 0) + 1);
  return [...counts].map(([letter, misses]) => ({ letter, misses })).sort((a, b) => b.misses - a.misses || a.letter.localeCompare(b.letter));
}

/** Share of items finished, 0..100, for the progress bar. */
export const progressPct = (finished: number, total: number) => (total <= 0 ? 0 : Math.min(100, Math.round((finished / total) * 100)));
