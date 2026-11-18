/** Daily XP and streak by the learner's local calendar day (docs/03 §3.5). Pure, injected clock. */

import type { DailyActivity, Stats } from '@/storage/types';

export const KEEP_DAYS = 120;
type StreakStats = Pick<Stats, 'total_xp' | 'current_streak' | 'longest_streak' | 'last_goal_date'>;
type Daily = Record<string, DailyActivity>;

/** 'YYYY-MM-DD' of `now` in the IANA time zone `tz`. */
export function dateKey(now: Date, tz: string): string {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(now)
    .reduce<Record<string, string>>((acc, x) => ({ ...acc, [x.type]: x.value }), {});
  return `${p.year}-${p.month}-${p.day}`;
}

function dayBefore(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

/** The streak as shown now: it falls to 0 when the last goal day is older than yesterday. */
export function readStreak<S extends StreakStats>(stats: S, now: Date, tz: string): S {
  const today = dateKey(now, tz);
  const last = stats.last_goal_date;
  if (last === null || last === today || last === dayBefore(today)) return stats;
  return { ...stats, current_streak: 0 };
}

export function applyDailyXp<S extends StreakStats>(
  stats: S,
  daily: Daily,
  xp: number,
  goal: number,
  now: Date,
  tz: string,
  lessonCompleted = false,
): { stats: S; daily: Daily } {
  const today = dateKey(now, tz);
  const prev = daily[today] ?? { xp_earned: 0, lessons_completed: 0, goal_met: false };
  const xp_earned = prev.xp_earned + xp;
  const goal_met = xp_earned >= goal;
  const entry = { xp_earned, lessons_completed: prev.lessons_completed + (lessonCompleted ? 1 : 0), goal_met };

  const kept = Object.keys({ ...daily, [today]: entry }).sort().slice(-KEEP_DAYS);
  const nextDaily = Object.fromEntries(kept.map((k) => [k, k === today ? entry : daily[k]]));

  let next: S = { ...readStreak(stats, now, tz), total_xp: stats.total_xp + xp };
  if (goal_met && !prev.goal_met && next.last_goal_date !== today) {
    const current_streak = next.last_goal_date === dayBefore(today) ? next.current_streak + 1 : 1;
    next = {
      ...next,
      current_streak,
      longest_streak: Math.max(next.longest_streak, current_streak),
      last_goal_date: today,
    };
  }
  return { stats: next, daily: nextDaily };
}
