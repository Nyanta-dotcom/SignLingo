import { describe, expect, it } from 'vitest';
import { computeXp } from './xp';

describe('computeXp (docs/03 §3.5)', () => {
  it('adds base, accuracy bonus round(5 x accuracy) and a no-heart-lost bonus', () => {
    expect(computeXp({ xpReward: 10, accuracy: 0.9, heartsLost: 0 })).toEqual({
      base: 10, accuracyBonus: 5, noHeartLossBonus: 5, total: 20,
    });
  });

  it('gives no bonus for lost hearts and rounds the accuracy bonus', () => {
    expect(computeXp({ xpReward: 10, accuracy: 0.5, heartsLost: 2 })).toEqual({
      base: 10, accuracyBonus: 3, noHeartLossBonus: 0, total: 13,
    });
  });

  it('defaults the reward to 10 and rejects an accuracy outside 0..1', () => {
    expect(computeXp({ accuracy: 0, heartsLost: 1 }).base).toBe(10);
    expect(() => computeXp({ accuracy: 1.2, heartsLost: 0 })).toThrow();
  });
});
