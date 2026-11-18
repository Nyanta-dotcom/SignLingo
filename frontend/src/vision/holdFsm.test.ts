import { describe, expect, it } from 'vitest';
import { createHoldVerifier } from './holdFsm';

const CFG = { holdMs: 1000, threshold: 0.6, graceMs: 150, timeLimitMs: 10_000 };
const good = (nowMs: number) => ({ label: 'C', confidence: 0.9, nowMs });
const miss = (nowMs: number, label: string | null = 'O', confidence = 0.9) => ({ label, confidence, nowMs });

describe('HoldVerifier', () => {
  it('is idle until reset, then searching', () => {
    const h = createHoldVerifier();
    expect(h.update(good(0)).state).toBe('idle');
    h.reset('C', CFG);
    expect(h.update(miss(0)).state).toBe('searching');
  });

  it('verifies at exactly hold_ms of continuous correct sign (AC-LRN-01)', () => {
    const h = createHoldVerifier();
    h.reset('C', CFG);
    let r = h.update(good(0));
    expect(r).toEqual({ state: 'holding', progress: 0 });
    r = h.update(good(500));
    expect(r.progress).toBeCloseTo(0.5);
    r = h.update(good(999));
    expect(r.state).toBe('holding');
    r = h.update(good(1000));
    expect(r).toEqual({ state: 'verified', progress: 1 });
  });

  it('a wrong label or low confidence is ignored for up to the grace period', () => {
    const h = createHoldVerifier();
    h.reset('C', CFG);
    h.update(good(0));
    h.update(good(300));
    expect(h.update(miss(400)).state).toBe('holding'); // 100 ms since the last good frame
    expect(h.update(good(450)).state).toBe('holding');
    expect(h.update(good(1000)).state).toBe('verified'); // clock kept running through the glitch
  });

  it('loses the hold after the grace period and starts over', () => {
    const h = createHoldVerifier();
    h.reset('C', CFG);
    h.update(good(0));
    h.update(good(300));
    expect(h.update(miss(500)).state).toBe('searching'); // 200 ms > 150 ms grace
    expect(h.update(good(600)).progress).toBe(0);
    expect(h.update(good(1500)).state).toBe('holding');
    expect(h.update(good(1600)).state).toBe('verified');
  });

  it('confidence below the threshold does not count as holding', () => {
    const h = createHoldVerifier();
    h.reset('C', CFG);
    expect(h.update({ label: 'C', confidence: 0.59, nowMs: 0 }).state).toBe('searching');
  });

  it('a null label (no hand) is a miss', () => {
    const h = createHoldVerifier();
    h.reset('C', CFG);
    h.update(good(0));
    expect(h.update(miss(400, null, 0)).state).toBe('searching');
  });

  it('times out when the limit passes without verifying, and stays terminal', () => {
    const h = createHoldVerifier();
    h.reset('C', CFG);
    h.update(miss(0));
    expect(h.update(miss(9999)).state).toBe('searching');
    expect(h.update(miss(10_000)).state).toBe('timed_out');
    expect(h.update(good(10_100)).state).toBe('timed_out');
  });

  it('verified stays verified; reset starts a new target', () => {
    const h = createHoldVerifier();
    h.reset('C', CFG);
    h.update(good(0));
    h.update(good(1000));
    expect(h.update(miss(2000)).state).toBe('verified');
    h.reset('D', CFG);
    expect(h.update(good(3000)).state).toBe('searching'); // label C is not the new target D
  });
});
