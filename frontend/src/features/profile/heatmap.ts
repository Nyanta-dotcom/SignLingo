import type { DailyActivity } from '@/storage/types';

export type HeatDay = { date: string; xp: number; level: 0 | 1 | 2 | 3 | 4; future: boolean };

const DAY_MS = 86_400_000;
const parse = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const format = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Level 0 = no XP; 1..4 grow with the share of the daily goal reached (< 50%, < 100%, < 200%, more). */
export function heatLevel(xp: number, goal: number): HeatDay['level'] {
  if (xp <= 0) return 0;
  const ratio = xp / goal;
  return ratio < 0.5 ? 1 : ratio < 1 ? 2 : ratio < 2 ? 3 : 4;
}

/**
 * `weeks` columns of 7 days (Monday first); the last column is the week containing `todayKey`.
 * Dates are plain YYYY-MM-DD keys in the learner's timezone, so only calendar arithmetic is done here.
 */
export function buildHeatmap(daily: Record<string, DailyActivity>, todayKey: string, goal: number, weeks = 12): HeatDay[][] {
  const today = parse(todayKey);
  const weekday = (new Date(today).getUTCDay() + 6) % 7;
  const start = today - weekday * DAY_MS - (weeks - 1) * 7 * DAY_MS;
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const ms = start + (w * 7 + d) * DAY_MS;
      const date = format(ms);
      const xp = daily[date]?.xp_earned ?? 0;
      return { date, xp, level: heatLevel(xp, goal), future: ms > today };
    }),
  );
}
