import { beforeEach, describe, expect, it } from 'vitest';
import { createKV } from './kv';
import { createLearnerStore } from './learnerStore';

const NOW = new Date('2026-03-01T03:00:00Z');
const make = (now: Date = NOW) => createLearnerStore(createKV(), () => now);

beforeEach(() => localStorage.clear());

describe('LearnerStore defaults and persistence', () => {
  it('starts with documented defaults', () => {
    const s = make();
    expect(s.getSettings()).toEqual({
      theme: 'system', handedness: 'right', sound_on: true, reduced_motion: 'system', daily_xp_goal: 20,
    });
    expect(s.getStats()).toMatchObject({ total_xp: 0, current_streak: 0, hearts: 5, last_goal_date: null });
    expect(s.getProgress()).toEqual({});
  });

  it('merges settings patches and survives a reload', () => {
    make().updateSettings({ theme: 'dark', daily_xp_goal: 30 });
    const reloaded = make();
    expect(reloaded.getSettings()).toMatchObject({ theme: 'dark', daily_xp_goal: 30, sound_on: true });
  });

  it('creates the profile once with the device time zone', () => {
    const a = make().getProfile();
    expect(a.timezone).toBeTruthy();
    expect(make(new Date('2027-01-01T00:00:00Z')).getProfile().created_at).toBe(a.created_at);
  });

  it('regenerates hearts and expires an old streak lazily when stats are read', () => {
    const s = make();
    s.saveStats({
      ...s.getStats(), hearts: 2, hearts_updated_at: '2026-03-01T01:00:00Z',
      current_streak: 3, longest_streak: 3, last_goal_date: '2026-02-20',
    });
    const read = s.getStats();
    expect(read.hearts).toBe(5); // 2 h = 4 regenerated hearts, capped at 5
    expect(read.current_streak).toBe(0);
    expect(read.longest_streak).toBe(3);
  });
});
