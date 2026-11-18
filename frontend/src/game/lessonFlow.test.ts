import { describe, expect, it } from 'vitest';
import type { Item } from '@/content/types';
import { DEFAULT_TIME_LIMIT_MS, letterOf, missedLetters, performConfig, progressPct, toAttempt } from './lessonFlow';

const rec = { threshold: 0.6, hold_ms: 1000 };
const item = (over: Partial<Item> = {}): Item => ({ order: 3, type: 'perform_sign', sign_code: 'LETTER_C', ...over });

describe('performConfig', () => {
  it('uses the manifest recommendation and the default time limit', () => {
    expect(performConfig(item(), rec)).toEqual({ holdMs: 1000, threshold: 0.6, timeLimitMs: DEFAULT_TIME_LIMIT_MS });
  });
  it('lets the item override each value', () => {
    expect(performConfig(item({ config: { hold_ms: 500, threshold: 0.8, time_limit_ms: 5000 } }), rec)).toEqual({ holdMs: 500, threshold: 0.8, timeLimitMs: 5000 });
  });
});

describe('toAttempt', () => {
  it('records a verified sign with its time and confidence', () => {
    expect(toAttempt(item(), { result: 'correct', label: 'C', confidence: 0.91, timeToVerifyMs: 1800 })).toEqual({
      item_order: 3, position: null, expected: 'C', predicted: 'C', confidence: 0.91, result: 'correct', time_to_verify_ms: 1800, retries: 0, confused_with: null,
    });
  });
  it('records a timeout with the last guess and what it was confused with', () => {
    expect(toAttempt(item(), { result: 'timed_out', lastLabel: 'O', lastConfidence: 0.7, confusedWith: 'O' })).toMatchObject({
      expected: 'C', predicted: 'O', confidence: 0.7, result: 'timed_out', time_to_verify_ms: null, confused_with: 'O',
    });
  });
  it('records a skip without a verification time', () => {
    expect(toAttempt(item(), { result: 'skipped', lastLabel: null, lastConfidence: null })).toMatchObject({ result: 'skipped', predicted: null, confidence: null, time_to_verify_ms: null });
  });
  it('takes the expected letter from the sign code', () => {
    expect(letterOf('LETTER_Q')).toBe('Q');
  });
});

describe('missedLetters', () => {
  const att = (expected: string, result: 'correct' | 'timed_out' | 'skipped') => toAttempt(item({ sign_code: `LETTER_${expected}` }), result === 'correct'
    ? { result, label: expected, confidence: 1, timeToVerifyMs: 1 } : { result, lastLabel: null, lastConfidence: null, confusedWith: null } as never);
  it('counts misses per letter, most first, ties alphabetical, ignoring correct ones', () => {
    expect(missedLetters([att('S', 'timed_out'), att('A', 'correct'), att('N', 'skipped'), att('S', 'skipped'), att('M', 'timed_out')])).toEqual([
      { letter: 'S', misses: 2 }, { letter: 'M', misses: 1 }, { letter: 'N', misses: 1 },
    ]);
    expect(missedLetters([])).toEqual([]);
  });
});

describe('progressPct', () => {
  it('is a rounded percentage, capped, and 0 for an empty lesson', () => {
    expect([progressPct(0, 8), progressPct(3, 8), progressPct(8, 8), progressPct(9, 8), progressPct(1, 0)]).toEqual([0, 38, 100, 100, 0]);
  });
});
