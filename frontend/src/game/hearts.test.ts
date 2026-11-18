import { describe, expect, it } from 'vitest';
import type { Stats } from '@/storage/types';
import { applyHeartRegen, loseHeart, MAX_HEARTS, REGEN_MS } from './hearts';

type HeartState = Pick<Stats, 'hearts' | 'hearts_updated_at'>;
const T0 = Date.parse('2026-03-01T10:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString();
const state = (hearts: number, at = T0): HeartState => ({ hearts: hearts as Stats['hearts'], hearts_updated_at: iso(at) });
const lose = (s: HeartState, now: number, confidence: number | null = 0.9) =>
  loseHeart(s, now, { confidence, threshold: 0.6 });

describe('applyHeartRegen', () => {
  it('goes 5 -> lose 2 -> +65 minutes -> 5 (cap)', () => {
    let s = lose(lose(state(5), T0).stats, T0).stats;
    expect(s.hearts).toBe(3);
    s = applyHeartRegen(s, T0 + 65 * 60_000);
    expect(s.hearts).toBe(MAX_HEARTS);
  });

  it('gives one heart per 30 minutes and keeps the remainder of the timer', () => {
    const s = applyHeartRegen(state(2), T0 + 40 * 60_000);
    expect(s.hearts).toBe(3);
    expect(s.hearts_updated_at).toBe(iso(T0 + REGEN_MS));
  });

  it('does not regenerate before 30 minutes and is idempotent', () => {
    const s = applyHeartRegen(state(2), T0 + 29 * 60_000);
    expect(s.hearts).toBe(2);
    expect(applyHeartRegen(s, T0 + 29 * 60_000)).toEqual(s);
  });

  it('a full heart bar never accumulates time', () => {
    const s = applyHeartRegen(state(5), T0 + 10 * REGEN_MS);
    expect(s.hearts).toBe(5);
    expect(s.hearts_updated_at).toBe(iso(T0 + 10 * REGEN_MS));
  });
});

describe('loseHeart', () => {
  it('loses a heart when the final confidence reached the threshold', () => {
    const r = lose(state(5), T0 + 1000);
    expect(r.lost).toBe(true);
    expect(r.stats.hearts).toBe(4);
    expect(r.stats.hearts_updated_at).toBe(iso(T0 + 1000)); // regen timer starts now
  });

  it('does not punish the learner when the model was unsure or saw no hand', () => {
    expect(lose(state(5), T0, 0.3).lost).toBe(false);
    expect(lose(state(5), T0, null).lost).toBe(false);
    expect(lose(state(5), T0, 0.3).stats.hearts).toBe(5);
  });

  it('keeps the running timer when already below the maximum, and never goes below 0', () => {
    const r = lose(state(3), T0 + 10 * 60_000);
    expect(r.stats.hearts).toBe(2);
    expect(r.stats.hearts_updated_at).toBe(iso(T0));
    expect(lose(state(0), T0).stats.hearts).toBe(0);
    expect(lose(state(0), T0).lost).toBe(false);
  });

  it('regenerates before losing', () => {
    const r = lose(state(2), T0 + 31 * 60_000);
    expect(r.stats.hearts).toBe(2); // 2 + 1 regen - 1 lost
  });
});

