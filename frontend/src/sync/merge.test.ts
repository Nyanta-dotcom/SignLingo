import { describe, expect, it } from 'vitest';
import type { Stats } from '@/storage/types';
import { mergeDay, mergeLesson, mergeProfile, mergeProgress, mergeStats, pickSynced, sameProgress } from './merge';

const stats = (over: Partial<Stats> = {}): Stats => ({
  total_xp: 0, current_streak: 0, longest_streak: 0, last_goal_date: null, hearts: 5, hearts_updated_at: '2026-11-01T00:00:00Z', ...over,
});

describe('mergeLesson', () => {
  it('keeps completion, the best accuracy, the most completions and the latest date', () => {
    const a = { status: 'in_progress' as const, best_accuracy_pct: 80, times_completed: 0, last_completed_at: null };
    const b = { status: 'completed' as const, best_accuracy_pct: 60, times_completed: 2, last_completed_at: '2026-11-02T00:00:00Z' };
    expect(mergeLesson(a, b)).toEqual({ status: 'completed', best_accuracy_pct: 80, times_completed: 2, last_completed_at: '2026-11-02T00:00:00Z' });
    expect(mergeLesson(b, a)).toEqual(mergeLesson(a, b));
  });
});

describe('mergeDay', () => {
  it('never loses XP of a day and keeps a met goal', () => {
    expect(mergeDay({ xp_earned: 10, lessons_completed: 1, goal_met: false }, { xp_earned: 30, lessons_completed: 2, goal_met: true }))
      .toEqual({ xp_earned: 30, lessons_completed: 2, goal_met: true });
  });
});

describe('mergeStats', () => {
  it('takes the larger XP and longest streak, the streak with the newer goal day, the hearts that were updated last', () => {
    const local = stats({ total_xp: 50, longest_streak: 3, current_streak: 1, last_goal_date: '2026-11-20', hearts: 2, hearts_updated_at: '2026-11-20T10:00:00Z' });
    const remote = stats({ total_xp: 80, longest_streak: 7, current_streak: 4, last_goal_date: '2026-11-21', hearts: 5, hearts_updated_at: '2026-11-19T10:00:00Z' });
    expect(mergeStats(local, remote)).toEqual({
      total_xp: 80, longest_streak: 7, current_streak: 4, last_goal_date: '2026-11-21', hearts: 2, hearts_updated_at: '2026-11-20T10:00:00Z',
    });
  });

  it('treats a missing goal date as the oldest', () => {
    const merged = mergeStats(stats({ current_streak: 0, last_goal_date: null }), stats({ current_streak: 2, last_goal_date: '2026-11-01' }));
    expect(merged.current_streak).toBe(2);
  });
});

describe('mergeProfile', () => {
  it('keeps the earliest creation date and this device time zone, and a name from either side', () => {
    expect(mergeProfile({ created_at: '2026-11-05', timezone: 'Asia/Ho_Chi_Minh' }, { created_at: '2026-11-01', timezone: 'UTC', display_name: 'An' }))
      .toEqual({ created_at: '2026-11-01', timezone: 'Asia/Ho_Chi_Minh', display_name: 'An' });
  });
});

describe('mergeProgress', () => {
  const lesson = (pct: number, status: 'completed' | 'in_progress' = 'completed') => ({ status, best_accuracy_pct: pct, times_completed: 1, last_completed_at: '2026-11-01' });

  it('unions lessons, days and signs from both sides', () => {
    const local = { progress: { L1: lesson(90) }, daily: { '2026-11-01': { xp_earned: 10, lessons_completed: 1, goal_met: true } }, sign_stats: { A: { attempts: 3, correct: 2, avg_time_to_verify_ms: 900 } } };
    const remote = { progress: { L2: lesson(70) }, daily: { '2026-11-02': { xp_earned: 20, lessons_completed: 2, goal_met: true } }, sign_stats: { A: { attempts: 9, correct: 8, avg_time_to_verify_ms: 800 } } };
    const merged = mergeProgress(local, remote);
    expect(Object.keys(merged.progress ?? {})).toEqual(['L1', 'L2']);
    expect(Object.keys(merged.daily ?? {})).toEqual(['2026-11-01', '2026-11-02']);
    expect(merged.sign_stats?.A.attempts).toBe(9);
  });

  it('keeps total XP at least as large as the XP of all days, when two devices earned on different days', () => {
    const day = (xp: number) => ({ xp_earned: xp, lessons_completed: 1, goal_met: true });
    const a = { stats: stats({ total_xp: 400 }), daily: { '2026-11-20': day(300), '2026-11-21': day(100) } };
    const b = { stats: stats({ total_xp: 223 }), daily: { '2026-11-22': day(223) } };
    expect(mergeProgress(a, b).stats?.total_xp).toBe(623);
    expect(mergeProgress(b, a)).toEqual(mergeProgress(a, b));
    expect(mergeProgress(mergeProgress(a, b), b)).toEqual(mergeProgress(a, b));
  });

  it('is symmetric and idempotent', () => {
    const a = { stats: stats({ total_xp: 10 }), progress: { L1: lesson(50) } };
    const b = { stats: stats({ total_xp: 20 }), progress: { L1: lesson(90), L2: lesson(60) } };
    expect(mergeProgress(a, b)).toEqual(mergeProgress(b, a));
    const once = mergeProgress(a, b);
    expect(mergeProgress(once, b)).toEqual(once);
  });

  it('returns the other side when one side is empty', () => {
    const b = { stats: stats({ total_xp: 20 }), progress: { L1: lesson(90) } };
    expect(mergeProgress({}, b)).toEqual(b);
    expect(mergeProgress(b, {})).toEqual(b);
    expect(mergeProgress({}, {})).toEqual({});
  });
});

describe('pickSynced and sameProgress', () => {
  it('uploads only progress, never settings, sessions or benchmarks', () => {
    const data = { stats: stats(), settings: { theme: 'dark' }, sessions: [{ id: 's' }], benchmarks: [{ id: 'b' }], progress: {} };
    expect(Object.keys(pickSynced(data))).toEqual(['stats', 'progress']);
  });

  it('ignores device-only data when comparing', () => {
    const a = { stats: stats() };
    expect(sameProgress(a, { ...a, settings: { theme: 'dark' } })).toBe(true);
    expect(sameProgress(a, { stats: stats({ total_xp: 1 }) })).toBe(false);
  });
});
