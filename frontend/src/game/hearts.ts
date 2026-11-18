/** Hearts (docs/03 §3.5): max 5, +1 per 30 min computed lazily on read, injected clock. */

import type { Stats } from '@/storage/types';

export const MAX_HEARTS = 5;
export const REGEN_MS = 30 * 60_000;

type HeartState = Pick<Stats, 'hearts' | 'hearts_updated_at'>;
const clamp = (n: number): Stats['hearts'] => Math.max(0, Math.min(MAX_HEARTS, n)) as Stats['hearts'];

/** Adds the hearts earned since `hearts_updated_at`; a full bar does not accumulate time. */
export function applyHeartRegen<S extends HeartState>(stats: S, now: number): S {
  const iso = (ms: number) => new Date(ms).toISOString();
  if (stats.hearts >= MAX_HEARTS) return { ...stats, hearts_updated_at: iso(now) };
  const since = Date.parse(stats.hearts_updated_at);
  const gained = Math.max(0, Math.floor((now - since) / REGEN_MS));
  if (gained === 0) return stats;
  const hearts = clamp(stats.hearts + gained);
  const updated = hearts >= MAX_HEARTS ? now : since + gained * REGEN_MS;
  return { ...stats, hearts, hearts_updated_at: iso(updated) };
}

/**
 * A heart is lost only when the model's final confidence reached `threshold`; an unsure model
 * (or no hand seen: confidence null) must not punish the learner.
 */
export function loseHeart<S extends HeartState>(
  stats: S,
  now: number,
  { confidence, threshold }: { confidence: number | null; threshold: number },
): { stats: S; lost: boolean } {
  const current = applyHeartRegen(stats, now);
  if (confidence === null || confidence < threshold || current.hearts === 0) {
    return { stats: current, lost: false };
  }
  const startTimer = current.hearts === MAX_HEARTS;
  return {
    stats: {
      ...current,
      hearts: clamp(current.hearts - 1),
      hearts_updated_at: startTimer ? new Date(now).toISOString() : current.hearts_updated_at,
    },
    lost: true,
  };
}
