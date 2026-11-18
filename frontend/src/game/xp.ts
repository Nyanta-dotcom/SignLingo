/** XP for a completed lesson (docs/03 §3.5). Pure: no DOM, no storage. Defaults still need approval. */

export const DEFAULT_XP_REWARD = 10;
const ACCURACY_BONUS_MAX = 5;
const NO_HEART_LOSS_BONUS = 5;

export type XpInput = {
  xpReward?: number;
  /** Fraction of correct items, 0..1. */
  accuracy: number;
  heartsLost: number;
};

export type XpBreakdown = {
  base: number;
  accuracyBonus: number;
  noHeartLossBonus: number;
  total: number;
};

export function computeXp({ xpReward = DEFAULT_XP_REWARD, accuracy, heartsLost }: XpInput): XpBreakdown {
  if (!(accuracy >= 0 && accuracy <= 1)) throw new RangeError(`accuracy must be in 0..1, got ${accuracy}`);
  const accuracyBonus = Math.round(ACCURACY_BONUS_MAX * accuracy);
  const noHeartLossBonus = heartsLost === 0 ? NO_HEART_LOSS_BONUS : 0;
  return {
    base: xpReward,
    accuracyBonus,
    noHeartLossBonus,
    total: xpReward + accuracyBonus + noHeartLossBonus,
  };
}
