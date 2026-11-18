import { describe, expect, it } from 'vitest';
import { applyDailyXp, dateKey, readStreak } from './streak';

const TZ = 'Asia/Ho_Chi_Minh';
const base = { total_xp: 0, current_streak: 0, longest_streak: 0, last_goal_date: null as string | null };
const at = (s: string) => new Date(s);

describe('dateKey', () => {
  it('uses the local calendar day of the time zone, not UTC', () => {
    expect(dateKey(at('2026-03-01T16:30:00Z'), TZ)).toBe('2026-03-01'); // 23:30 local
    expect(dateKey(at('2026-03-01T17:30:00Z'), TZ)).toBe('2026-03-02'); // 00:30 local
  });
});

describe('applyDailyXp', () => {
  it('counts xp per day and meets the goal once', () => {
    const r = applyDailyXp(base, {}, 15, 20, at('2026-03-01T03:00:00Z'), TZ);
    expect(r.daily['2026-03-01']).toEqual({ xp_earned: 15, lessons_completed: 0, goal_met: false });
    expect(r.stats.current_streak).toBe(0);
    const r2 = applyDailyXp(r.stats, r.daily, 10, 20, at('2026-03-01T04:00:00Z'), TZ, true);
    expect(r2.daily['2026-03-01']).toEqual({ xp_earned: 25, lessons_completed: 1, goal_met: true });
    expect(r2.stats).toMatchObject({ current_streak: 1, longest_streak: 1, last_goal_date: '2026-03-01', total_xp: 25 });
    const r3 = applyDailyXp(r2.stats, r2.daily, 10, 20, at('2026-03-01T05:00:00Z'), TZ);
    expect(r3.stats.current_streak).toBe(1); // more xp the same day does not add again
  });

  it('crossing local midnight starts a new day and continues the streak', () => {
    let r = applyDailyXp(base, {}, 20, 20, at('2026-03-01T16:30:00Z'), TZ); // 23:30 on the 1st
    r = applyDailyXp(r.stats, r.daily, 20, 20, at('2026-03-01T17:30:00Z'), TZ); // 00:30 on the 2nd
    expect(r.stats).toMatchObject({ current_streak: 2, last_goal_date: '2026-03-02' });
    expect(Object.keys(r.daily)).toEqual(['2026-03-01', '2026-03-02']);
  });

  it('a skipped day restarts the streak at 1 and keeps the longest', () => {
    let r = applyDailyXp(base, {}, 20, 20, at('2026-03-01T03:00:00Z'), TZ);
    r = applyDailyXp(r.stats, r.daily, 20, 20, at('2026-03-02T03:00:00Z'), TZ);
    r = applyDailyXp(r.stats, r.daily, 20, 20, at('2026-03-05T03:00:00Z'), TZ);
    expect(r.stats).toMatchObject({ current_streak: 1, longest_streak: 2 });
  });

  it('keeps only the latest 120 days', () => {
    const daily: Record<string, { xp_earned: number; lessons_completed: number; goal_met: boolean }> = {};
    for (let i = 0; i < 130; i++) {
      const d = new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10);
      daily[d] = { xp_earned: 1, lessons_completed: 0, goal_met: false };
    }
    const r = applyDailyXp(base, daily, 1, 20, at('2026-03-01T03:00:00Z'), TZ);
    expect(Object.keys(r.daily).length).toBe(120);
    expect(r.daily['2026-03-01']).toBeDefined();
  });
});

describe('readStreak (AC-GAM-02)', () => {
  const s = { ...base, current_streak: 4, longest_streak: 4, last_goal_date: '2026-03-01' };
  it('is kept today and yesterday', () => {
    expect(readStreak(s, at('2026-03-01T03:00:00Z'), TZ).current_streak).toBe(4);
    expect(readStreak(s, at('2026-03-02T03:00:00Z'), TZ).current_streak).toBe(4);
  });
  it('drops to 0 after a missed day but keeps the longest', () => {
    const r = readStreak(s, at('2026-03-03T03:00:00Z'), TZ);
    expect(r.current_streak).toBe(0);
    expect(r.longest_streak).toBe(4);
  });
});
